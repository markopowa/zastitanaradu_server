import shutil
import tempfile
from pathlib import Path

import docx
from django.conf import settings
from django.core.files.base import ContentFile
from django.test import TestCase

from .models import DocumentCategory, DocumentTemplate, TemplateFieldDefinition
from .utils import (
    _display_label_for_key,
    generate_page_images,
    make_display_copy,
)


def build_docx(build_fn) -> Path:
    doc = docx.Document()
    build_fn(doc)
    tmp_dir = Path(tempfile.mkdtemp(prefix="test_display_copy_src_"))
    path = tmp_dir / "source.docx"
    doc.save(str(path))
    return path


class MakeDisplayCopyTests(TestCase):
    def setUp(self):
        TemplateFieldDefinition.objects.create(
            key="employee.first_name",
            label="Ime zaposlenog",
            category=TemplateFieldDefinition.CATEGORY_EMPLOYEE,
            order=1,
        )
        TemplateFieldDefinition.objects.create(
            key="amount",
            label="Iznos",
            category=TemplateFieldDefinition.CATEGORY_PROCESS,
            order=2,
        )

    def test_paragraph_tag_replaced_with_label_badge(self):
        src = build_docx(
            lambda doc: doc.add_paragraph("Ime: {{ employee.first_name }} kraj.")
        )
        result_path = make_display_copy(src)
        self.addCleanup(shutil.rmtree, result_path.parent, ignore_errors=True)
        self.addCleanup(shutil.rmtree, src.parent, ignore_errors=True)

        result_doc = docx.Document(str(result_path))
        para = result_doc.paragraphs[0]

        self.assertEqual(para.text, "Ime:  Ime zaposlenog  kraj.")

        badge_run = next(
            r for r in para.runs if r.text.strip() == "Ime zaposlenog"
        )
        self.assertTrue(badge_run.font.bold)
        from docx.enum.text import WD_COLOR_INDEX
        self.assertEqual(badge_run.font.highlight_color, WD_COLOR_INDEX.BRIGHT_GREEN)

        non_tag_runs = [r for r in para.runs if r.text.strip() != "Ime zaposlenog"]
        for run in non_tag_runs:
            self.assertFalse(run.font.highlight_color)

    def test_non_tag_text_and_formatting_preserved(self):
        def build(doc):
            para = doc.add_paragraph()
            run = para.add_run("Pre: ")
            run.bold = True
            para.add_run("{{ employee.first_name }}")
            para.add_run(" posle.")

        src = build_docx(build)
        result_path = make_display_copy(src)
        self.addCleanup(shutil.rmtree, result_path.parent, ignore_errors=True)
        self.addCleanup(shutil.rmtree, src.parent, ignore_errors=True)

        result_doc = docx.Document(str(result_path))
        para = result_doc.paragraphs[0]
        self.assertEqual(para.text, "Pre:  Ime zaposlenog  posle.")

        first_run = para.runs[0]
        self.assertEqual(first_run.text, "Pre: ")
        self.assertTrue(first_run.font.bold)

        last_run = para.runs[-1]
        self.assertEqual(last_run.text, " posle.")
        self.assertTrue(last_run.font.bold)

    def test_row_scope_key_uses_field_part_of_catalog(self):
        src = build_docx(lambda doc: doc.add_paragraph("Vrednost: {{ r.amount }}"))
        result_path = make_display_copy(src)
        self.addCleanup(shutil.rmtree, result_path.parent, ignore_errors=True)
        self.addCleanup(shutil.rmtree, src.parent, ignore_errors=True)

        result_doc = docx.Document(str(result_path))
        self.assertEqual(result_doc.paragraphs[0].text, "Vrednost:  Iznos ")

    def test_row_scope_key_unknown_falls_back_to_humanized_field_name(self):
        src = build_docx(lambda doc: doc.add_paragraph("Vrednost: {{ r.report_number }}"))
        result_path = make_display_copy(src)
        self.addCleanup(shutil.rmtree, result_path.parent, ignore_errors=True)
        self.addCleanup(shutil.rmtree, src.parent, ignore_errors=True)

        result_doc = docx.Document(str(result_path))
        self.assertEqual(result_doc.paragraphs[0].text, "Vrednost:  Report number ")

    def test_unknown_key_falls_back_to_humanized_last_segment(self):
        src = build_docx(lambda doc: doc.add_paragraph("{{ some.unknown.key }}"))
        result_path = make_display_copy(src)
        self.addCleanup(shutil.rmtree, result_path.parent, ignore_errors=True)
        self.addCleanup(shutil.rmtree, src.parent, ignore_errors=True)

        result_doc = docx.Document(str(result_path))
        text = result_doc.paragraphs[0].text
        self.assertEqual(text, " Key ")
        self.assertNotIn("some.unknown.key", text)
        self.assertNotIn(".", text)

    def test_table_cell_paragraphs_handled_recursively(self):
        def build(doc):
            table = doc.add_table(rows=1, cols=2)
            table.cell(0, 0).text = "label"
            table.cell(0, 1).text = "{{ employee.first_name }}"

        src = build_docx(build)
        result_path = make_display_copy(src)
        self.addCleanup(shutil.rmtree, result_path.parent, ignore_errors=True)
        self.addCleanup(shutil.rmtree, src.parent, ignore_errors=True)

        result_doc = docx.Document(str(result_path))
        cell_text = result_doc.tables[0].cell(0, 1).text
        self.assertEqual(cell_text, " Ime zaposlenog ")

    def test_no_tags_copies_file_unchanged(self):
        src = build_docx(lambda doc: doc.add_paragraph("Bez tagova."))
        result_path = make_display_copy(src)
        self.addCleanup(shutil.rmtree, result_path.parent, ignore_errors=True)
        self.addCleanup(shutil.rmtree, src.parent, ignore_errors=True)

        result_doc = docx.Document(str(result_path))
        self.assertEqual(result_doc.paragraphs[0].text, "Bez tagova.")

    def test_display_label_for_key_helper(self):
        catalog = {"employee.first_name": "Ime zaposlenog", "amount": "Iznos"}
        self.assertEqual(
            _display_label_for_key("employee.first_name", catalog),
            "Ime zaposlenog",
        )
        self.assertEqual(_display_label_for_key("r.amount", catalog), "Iznos")
        self.assertEqual(_display_label_for_key("r.missing_field", catalog), "Missing field")
        self.assertEqual(_display_label_for_key("nope", catalog), "Nope")
        self.assertEqual(
            _display_label_for_key("some.unknown.key", catalog), "Key")


class GeneratePageImagesUsesDisplayCopyTests(TestCase):
    def setUp(self):
        TemplateFieldDefinition.objects.create(
            key="employee.first_name",
            label="Ime zaposlenog",
            category=TemplateFieldDefinition.CATEGORY_EMPLOYEE,
            order=1,
        )
        self.category = DocumentCategory.objects.create(name="Test kategorija")

    def test_generated_pdf_source_uses_badge_labels(self):
        if not shutil.which(settings.LIBREOFFICE_BIN):
            self.skipTest("LibreOffice not available on this host")

        doc = docx.Document()
        doc.add_paragraph("Ime: {{ employee.first_name }}")
        buf_path = Path(tempfile.mkdtemp(prefix="test_gpi_src_")) / "tpl.docx"
        doc.save(str(buf_path))
        self.addCleanup(shutil.rmtree, buf_path.parent, ignore_errors=True)

        template = DocumentTemplate.objects.create(
            name="Test sablon",
            category=self.category,
            context_type=DocumentTemplate.CONTEXT_EMPLOYEE,
        )
        with open(buf_path, "rb") as fh:
            template.template_file.save("tpl.docx", ContentFile(fh.read()))
        self.addCleanup(template.template_file.delete, save=False)

        source_path = Path(template.template_file.path)
        pages_dir = Path(settings.MEDIA_ROOT) / "template_pages" / str(template.pk)
        self.addCleanup(shutil.rmtree, pages_dir, ignore_errors=True)

        rel_paths = generate_page_images(template.pk, source_path)
        self.assertTrue(rel_paths)
        for rel in rel_paths:
            png_path = Path(settings.MEDIA_ROOT) / rel
            self.assertTrue(png_path.exists())
