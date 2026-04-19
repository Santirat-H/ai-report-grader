export default function Dashboard() {
  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Overview Dashboard</h1>
      
      {/* โครงสร้างสำหรับการ์ดสรุปผล (Summary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-medium text-slate-500">Total Reports Evaluated</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-medium text-slate-500">Average Score</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">0.00 <span className="text-sm text-slate-400">/ 5.00</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-medium text-slate-500">Pending Review</h2>
          <p className="text-3xl font-bold text-amber-500 mt-2">0</p>
        </div>
      </div>
    </div>
  );
}