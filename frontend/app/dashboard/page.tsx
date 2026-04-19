import Dashboard from "../components/dashboard";
import FileList from '../components/file-list';

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                <Dashboard />
                <FileList />
            </div>
        </div>
    );
}