import { Tab, Tabs } from "@mui/material";

import { COMPANY_TABS, type CompanyTabKey } from "../utils/companyTabs";

interface CompanyTabBarProps {
    activeTab: CompanyTabKey;
    onChange: (tab: CompanyTabKey) => void;
}

export function CompanyTabBar({ activeTab, onChange }: CompanyTabBarProps) {
    return (
        <Tabs
            value={activeTab}
            onChange={(_, value: CompanyTabKey) => onChange(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
        >
            {COMPANY_TABS.map((tab) => (
                <Tab key={tab.key} value={tab.key} label={tab.label} />
            ))}
        </Tabs>
    );
}
