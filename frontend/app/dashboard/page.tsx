"use client";

import { useState } from "react";
import Dashboard from "../components/dashboard";
import FileList from "../components/file-list";

export default function DashboardPage() {
    const [scoreMode, setScoreMode] = useState<"total" | "average">("total");

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <Dashboard />
                <FileList
                    scoreMode={scoreMode}
                    onScoreModeChange={setScoreMode}
                />
            </div>
        </div>
    );
}
