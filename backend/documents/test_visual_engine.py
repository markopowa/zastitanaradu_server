import shutil
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import fitz
from django.test import SimpleTestCase

from .utils import (
    _resolve_unicode_font_path,
    fill_pdf_at_coordinates,
    generate_visual_pdf,
    resolve_visual_fill,
)


def _skip_reason_if_no_unicode_font() -> str | None:
    try:
        _resolve_unicode_font_path()
    except RuntimeError as exc:
        return str(exc)
    return None


def make_blank_pdf(pages: int = 1) -> Path:
    doc = fitz.open()
    for _ in range(pages):
        doc.new_page(width=595, height=842)
    tmp_dir = Path(tempfile.mkdtemp(prefix="test_visual_engine_"))
    path = tmp_dir / "blank.pdf"
    doc.save(str(path))
    doc.close()
    return path


def page_text(pdf_bytes: bytes, page_num: int = 0) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return doc[page_num].get_text()
    finally:
        doc.close()


class FillPdfAtCoordinatesTests(SimpleTestCase):
    def setUp(self):
        skip_reason = _skip_reason_if_no_unicode_font()
        if skip_reason:
            self.skipTest(skip_reason)
        self.pdf_path = make_blank_pdf()
        self.addCleanup(shutil.rmtree, self.pdf_path.parent, ignore_errors=True)

    def test_field_key_resolves_from_context(self):
        placeholders = [{
            "fieldKey": "employee.full_name",
            "page": 0,
            "xPct": 10,
            "yPct": 10,
            "widthPct": 40,
            "heightPct": 5,
            "fontSize": 12,
        }]
        context = {"employee": {"full_name": "Marko Markovic"}}
        result = fill_pdf_at_coordinates(self.pdf_path, placeholders, context)
        self.assertIn("Marko Markovic", page_text(result))

    def test_fixed_text_ignores_context(self):
        placeholders = [{
            "fixedText": "Static label",
            "page": 0,
            "xPct": 10,
            "yPct": 10,
            "widthPct": 40,
            "heightPct": 5,
            "fontSize": 12,
        }]
        result = fill_pdf_at_coordinates(self.pdf_path, placeholders, {})
        self.assertIn("Static label", page_text(result))

    def test_missing_field_value_draws_nothing(self):
        placeholders = [{
            "fieldKey": "employee.full_name",
            "page": 0,
            "xPct": 10,
            "yPct": 10,
            "widthPct": 40,
            "heightPct": 5,
        }]
        result = fill_pdf_at_coordinates(self.pdf_path, placeholders, {})
        self.assertEqual(page_text(result).strip(), "")

    def test_series_placeholder_draws_one_row_per_item(self):
        placeholders = [{
            "seriesSource": "test_source",
            "page": 0,
            "yPct": 10,
            "rowHeightPct": 5,
            "columns": [
                {"xPct": 5, "widthPct": 20, "field": "r.rbr"},
                {"xPct": 30, "widthPct": 30, "field": "r.name"},
            ],
        }]
        items = [{"name": "Ana"}, {"name": "Bora"}, {"name": "Vera"}]
        with patch.dict(
            "processes.series_sources.SERIES_SOURCES",
            {"test_source": lambda entity, context: items},
        ):
            result = fill_pdf_at_coordinates(
                self.pdf_path, placeholders, {}, entity=object(),
            )
        text = page_text(result)
        for name in ("Ana", "Bora", "Vera"):
            self.assertIn(name, text)
        self.assertIn("1", text)
        self.assertIn("2", text)
        self.assertIn("3", text)

    def test_series_placeholder_without_entity_draws_nothing(self):
        placeholders = [{
            "seriesSource": "test_source",
            "page": 0,
            "yPct": 10,
            "rowHeightPct": 5,
            "columns": [{"xPct": 5, "widthPct": 20, "field": "r.name"}],
        }]
        with patch.dict(
            "processes.series_sources.SERIES_SOURCES",
            {"test_source": lambda entity, context: [{"name": "Ana"}]},
        ):
            result = fill_pdf_at_coordinates(self.pdf_path, placeholders, {})
        self.assertEqual(page_text(result).strip(), "")

    def test_series_placeholder_clamps_rows_past_page_bottom(self):
        placeholders = [{
            "seriesSource": "test_source",
            "page": 0,
            "yPct": 95,
            "rowHeightPct": 8,
            "columns": [{"xPct": 5, "widthPct": 20, "field": "r.name"}],
        }]
        items = [{"name": "Ana"}, {"name": "Bora"}]
        with patch.dict(
            "processes.series_sources.SERIES_SOURCES",
            {"test_source": lambda entity, context: items},
        ):
            with self.assertLogs("documents.utils", level="WARNING"):
                result = fill_pdf_at_coordinates(
                    self.pdf_path, placeholders, {}, entity=object(),
                )
        text = page_text(result)
        self.assertNotIn("Ana", text)
        self.assertNotIn("Bora", text)

    def test_series_placeholder_respects_max_rows_per_page(self):
        placeholders = [{
            "seriesSource": "test_source",
            "page": 0,
            "yPct": 10,
            "rowHeightPct": 5,
            "maxRowsPerPage": 2,
            "columns": [{"xPct": 5, "widthPct": 20, "field": "r.name"}],
        }]
        items = [{"name": "Ana"}, {"name": "Bora"}, {"name": "Vera"}]
        with patch.dict(
            "processes.series_sources.SERIES_SOURCES",
            {"test_source": lambda entity, context: items},
        ):
            with self.assertLogs("documents.utils", level="WARNING"):
                result = fill_pdf_at_coordinates(
                    self.pdf_path, placeholders, {}, entity=object(),
                )
        text = page_text(result)
        self.assertIn("Ana", text)
        self.assertIn("Bora", text)
        self.assertNotIn("Vera", text)


class ResolveVisualFillTests(SimpleTestCase):
    def test_blank_placements_win_over_master(self):
        doc_template = SimpleNamespace(
            generation_config={
                "mode": "VISUAL",
                "placeholders": [{"fieldKey": "master.field"}],
            },
            template_file=SimpleNamespace(path="/master.docx"),
        )
        blank_file = SimpleNamespace(path="/blank.docx")
        blank_placements = [{"fieldKey": "blank.field"}]
        fill_file, placements = resolve_visual_fill(
            doc_template, blank_file, blank_placements)
        self.assertIs(fill_file, blank_file)
        self.assertEqual(placements, blank_placements)

    def test_falls_back_to_master_when_blank_has_no_placements(self):
        doc_template = SimpleNamespace(
            generation_config={
                "mode": "VISUAL",
                "placeholders": [{"fieldKey": "master.field"}],
            },
            template_file=SimpleNamespace(path="/master.docx"),
        )
        blank_file = SimpleNamespace(path="/blank.docx")
        fill_file, placements = resolve_visual_fill(doc_template, blank_file, [])
        self.assertIs(fill_file, blank_file)
        self.assertEqual(placements, [{"fieldKey": "master.field"}])

    def test_falls_back_to_master_file_when_no_blank_file(self):
        doc_template = SimpleNamespace(
            generation_config={"mode": "VISUAL", "placeholders": []},
            template_file=SimpleNamespace(path="/master.docx"),
        )
        fill_file, _placements = resolve_visual_fill(doc_template, None, None)
        self.assertIs(fill_file, doc_template.template_file)


class GenerateVisualPdfTests(SimpleTestCase):
    def setUp(self):
        self.pdf_path = make_blank_pdf()
        self.addCleanup(shutil.rmtree, self.pdf_path.parent, ignore_errors=True)

    def test_uses_blank_file_and_its_placements(self):
        skip_reason = _skip_reason_if_no_unicode_font()
        if skip_reason:
            self.skipTest(skip_reason)
        doc_template = SimpleNamespace(
            generation_config={"mode": "VISUAL", "placeholders": []},
            template_file=SimpleNamespace(path="/should_not_be_used.docx"),
        )
        blank_file = SimpleNamespace(path=str(self.pdf_path))
        placements = [{
            "fieldKey": "employee.full_name",
            "page": 0, "xPct": 10, "yPct": 10, "widthPct": 40, "heightPct": 5,
        }]
        result = generate_visual_pdf(
            doc_template,
            {"employee": {"full_name": "Petar Petrovic"}},
            blank_file=blank_file,
            blank_placements=placements,
        )
        self.assertIn("Petar Petrovic", page_text(result))

    def test_raises_when_no_file_available(self):
        doc_template = SimpleNamespace(
            generation_config={"mode": "VISUAL", "placeholders": []},
            template_file=None,
        )
        with self.assertRaises(ValueError):
            generate_visual_pdf(doc_template, {})
