/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { 
  Fuel, User, Wrench, Building2, Route, Droplets, Truck, 
  Satellite, RotateCcw, Plus, Trash2, MapPin, Tag, Map,
  ArrowDown, ArrowRight, ChevronDown, FolderOpen, 
  CloudUpload, Database, Edit2, 
  Calculator, Inbox, X, FileSpreadsheet, Info, 
  AlertCircle, CheckCircle2, Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ==========================================
// 🚀 雲端與 API 設定
// ==========================================
const GAS_URL = (import.meta as any).env.VITE_GAS_URL || "https://script.google.com/macros/s/AKfycbxMwgKyp5YcZ5ZDp6Q53V6qpA4sBmwoht3li9hGanbJFizk06ZazA7ohYxTNmQHJYbw/exec"; 
const GOOGLE_MAPS_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_KEY || "AIzaSyDVt5ap79LCy2LPi7eWuCcl9MiRm7uKVCM";

// --- UI Components ---
const InputGroup = ({ label, type="number", value, onChange, icon: IconComp, step="any", placeholder, list, onAddRight }: any) => (
  <div className="flex flex-col gap-1 mb-3">
    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">{label}</label>
    <div className="relative flex gap-2">
      <div className="relative flex-1">
        {IconComp && <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500"><IconComp size={16} /></div>}
        <input 
          list={list} 
          type={type} 
          step={step} 
          value={value} 
          onChange={e=>onChange(e.target.value)} 
          placeholder={placeholder} 
          className={`w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${IconComp ? 'pl-10' : 'pl-4'} pr-4 text-base`} 
        />
      </div>
      <div className="flex gap-1">
        {onAddRight && (
          <button 
            onClick={() => onAddRight(value)} 
            className="shrink-0 bg-slate-800 hover:bg-emerald-900/40 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 px-3 rounded-xl transition-all shadow-sm" 
            title="新增至常用地點"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  </div>
);

export default function App() {
  // ... (rest of the state)
  // --- APP 狀態 ---
  const [activeTab, setActiveTab] = useState<'model' | 'history' | 'ai'>('model');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [isSyncing, setIsSyncing] = useState(false);

  // --- 建模參數 ---
  const [routeName, setRouteName] = useState('北高主線');
  const [startPoint, setStartPoint] = useState('烏日');
  const [endPoint, setEndPoint] = useState('大溪');
  const [mileage, setMileage] = useState<number | string>(320);
  const [fuelPrice, setFuelPrice] = useState<number | string>(29.5);
  const [fuelConsumption, setFuelConsumption] = useState<number | string>(2.7);
  const [ureaRate, setUreaRate] = useState<number | string>(2.5);
  const [maintenanceRate, setMaintenanceRate] = useState<number | string>(2.5);
  const [etagRate, setEtagRate] = useState<number | string>(1.0);
  const [driverSalary, setDriverSalary] = useState<number | string>(3000);
  const [loan, setLoan] = useState<number | string>(0);
  const [insurance, setInsurance] = useState<number | string>(0);
  const [taxes, setTaxes] = useState<number | string>(0);

  const [cloudRoutes, setCloudRoutes] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  
  const [savedLocations, setSavedLocations] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('m3_locations') || '["烏日", "大溪", "觀音", "岡山"]');
    } catch {
      return ["烏日", "大溪", "觀音", "岡山"];
    }
  });
  const [isLocManagerOpen, setIsLocManagerOpen] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isImportingLocs, setIsImportingLocs] = useState(false);

  // --- 初始化 ---
  useEffect(() => {
    loadCloudData();
    loadGoogleMaps();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const loadGoogleMaps = () => {
    const scriptSrc = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    if (!(window as any).google && !document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`)) {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      document.head.appendChild(script);
    }
  };

  const loadCloudData = async () => {
    setIsSyncing(true);
    try {
      // 讀取路線
      const resRoutes = await fetch(`${GAS_URL}?sheet=routes`);
      const dataRoutes = await resRoutes.json();
      if (Array.isArray(dataRoutes)) setCloudRoutes(dataRoutes);

      // 讀取常用地點
      const resLocs = await fetch(`${GAS_URL}?sheet=locations`);
      const dataLocs = await resLocs.json();
      if (Array.isArray(dataLocs) && dataLocs.length > 0) {
        const locNames = dataLocs.map((l: any) => l.name || l.location).filter(Boolean);
        if (locNames.length > 0) {
          setSavedLocations(locNames);
          localStorage.setItem('m3_locations', JSON.stringify(locNames));
        }
      }
    } catch (e) {
      showToast("雲端讀取失敗，請檢查網路", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncLocationsToCloud = async (newList: string[]) => {
    setIsSyncing(true);
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'sync_locations', 
          sheet: 'locations', 
          data: newList.map(name => ({ name })) 
        })
      });
    } catch (e) {
      console.error("Locations sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- 成本核心算法 ---
  const stats = useMemo(() => {
    const dist = parseFloat(mileage as string) || 0;
    const fPrice = parseFloat(fuelPrice as string) || 0;
    const fCons = parseFloat(fuelConsumption as string) || 1;
    const uRate = parseFloat(ureaRate as string) || 0;
    const mRate = parseFloat(maintenanceRate as string) || 0;
    const eRate = parseFloat(etagRate as string) || 0;
    const dSalary = parseFloat(driverSalary as string) || 0;
    const lVal = parseFloat(loan as string) || 0;
    const iVal = parseFloat(insurance as string) || 0;
    const tVal = parseFloat(taxes as string) || 0;

    const fuelUsed = dist / fCons;
    const cFuel = fuelUsed * fPrice;
    const cUrea = cFuel * (uRate / 100) || 0;
    const cMaint = dist * mRate;
    const cEtag = dist * eRate;
    
    const fSalary = dSalary;
    const fLoan = lVal / 30;
    const fFixed = iVal / 365 + tVal / 365;

    const dailyTotal = cFuel + cUrea + cMaint + cEtag + fSalary + fLoan + fFixed;

    return {
      dailyTotal,
      costPerKm: dist > 0 ? dailyTotal / dist : 0,
      breakdown: [
        { label: '油資', value: cFuel, color: 'bg-blue-500', icon: Fuel },
        { label: '薪資', value: fSalary, color: 'bg-emerald-500', icon: User },
        { label: '保修', value: cMaint, color: 'bg-amber-500', icon: Wrench },
        { label: '規費/貸款', value: fLoan + fFixed, color: 'bg-rose-500', icon: Building2 },
        { label: 'E-tag', value: cEtag, color: 'bg-slate-400', icon: Navigation },
        { label: '尿素', value: cUrea, color: 'bg-cyan-500', icon: Droplets }
      ]
    };
  }, [mileage, fuelPrice, fuelConsumption, ureaRate, maintenanceRate, etagRate, driverSalary, loan, insurance, taxes]);

  // --- 功能操作 ---
  const calculateDistance = async () => {
    if (!startPoint || !endPoint) return showToast("請填寫起點與終點", "error");
    
    const google = (window as any).google;
    if (!google) {
      showToast("地圖服務載入中，請稍候...", "error");
      loadGoogleMaps(); // Try loading again just in case
      return;
    }

    setIsCalculating(true);
    try {
      const service = new google.maps.DistanceMatrixService();
      
      // Helper to ensure Taiwan context if not specified
      const formatLoc = (loc: string) => {
        const trimmed = loc.trim();
        if (!trimmed) return "";
        return (trimmed.includes("台灣") || trimmed.includes("Taiwan")) ? trimmed : `${trimmed}, Taiwan`;
      };

      service.getDistanceMatrix({ 
        origins: [formatLoc(startPoint)], 
        destinations: [formatLoc(endPoint)], 
        travelMode: google.maps.TravelMode.DRIVING 
      }, (response: any, status: string) => {
        if (status === 'OK') {
          const element = response.rows[0].elements[0];
          if (element.status === 'OK') {
            const dist = Math.ceil(element.distance.value / 1000);
            setMileage(dist);
            showToast(`算距完成：${dist} KM`);
          } else if (element.status === 'NOT_FOUND') {
            console.error("Google Maps Distance Matrix Element Error:", element.status);
            showToast("找不到地點。請嘗試輸入更詳細的地址或加上縣市名稱（例如：台中烏日）。", "error");
          } else {
            console.error("Google Maps Distance Matrix Element Error:", element.status);
            showToast(`算距失敗: ${element.status}`, "error");
          }
        } else {
          console.error("Google Maps Distance Matrix Service Error:", status);
          showToast(`地圖服務錯誤: ${status}`, "error");
        }
        setIsCalculating(false);
      });
    } catch (e) {
      showToast("Google Maps 未就緒", "error");
      setIsCalculating(false);
    }
  };

  const handleNewRoute = () => {
    setCurrentRouteId(null);
    setRouteName('');
    setStartPoint('');
    setEndPoint('');
    setMileage(0);
  };

  const handleLoadRouteById = (id: string) => {
    if (!id) return handleNewRoute();
    const route = cloudRoutes.find(r => r.id === id);
    if (route) {
      setCurrentRouteId(route.id);
      setRouteName(route.name || '');
      setStartPoint(route.origin || '');
      setEndPoint(route.dest || '');
      setMileage(route.mileage || 0);
      showToast(`已載入：${route.name}`);
    }
  };

  const handleDeleteCurrent = async () => {
    if (!currentRouteId) return;
    await handleDelete(currentRouteId);
  };

  const addLocation = (loc: string) => {
    const val = String(loc).trim();
    if (!val) { showToast('請先輸入地點名稱', 'error'); return false; }
    if (savedLocations.includes(val)) { showToast('地點已存在於常用清單', 'error'); return false; }
    const newList = [...savedLocations, val];
    setSavedLocations(newList);
    localStorage.setItem('m3_locations', JSON.stringify(newList));
    syncLocationsToCloud(newList);
    showToast(`已新增常用地點：${val}`);
    return true;
  };

  const removeLocation = (loc: string) => {
    const newList = savedLocations.filter(l => l !== loc);
    setSavedLocations(newList);
    localStorage.setItem('m3_locations', JSON.stringify(newList));
    syncLocationsToCloud(newList);
  };

  const handleImportLocations = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingLocs(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

        const newLocsSet = new Set<string>(savedLocations);
        let importedCount = 0;

        rows.forEach(row => {
          const start = String(row['起點'] || row['Origin'] || row['origin'] || row['出發地'] || '').trim();
          const end = String(row['終點'] || row['Dest'] || row['dest'] || row['Destination'] || row['目的地'] || '').trim();

          if (start && !newLocsSet.has(start)) { newLocsSet.add(start); importedCount++; }
          if (end && !newLocsSet.has(end)) { newLocsSet.add(end); importedCount++; }
        });

        if (importedCount > 0) {
          const updatedList = Array.from(newLocsSet);
          setSavedLocations(updatedList);
          localStorage.setItem('m3_locations', JSON.stringify(updatedList));
          syncLocationsToCloud(updatedList);
          showToast(`成功從表單萃取並匯入 ${importedCount} 個新地點！`);
        } else {
          showToast('未發現新地點，請確認表頭是否包含「起點」與「終點」', 'error');
        }
      } catch (err) {
        showToast('檔案解析失敗，請確認是否為有效 Excel 檔', 'error');
      } finally {
        setIsImportingLocs(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (!routeName) return showToast("請輸入路線名稱", "error");
    setIsSyncing(true);
    const routeData = { 
      name: routeName, 
      origin: startPoint, 
      dest: endPoint, 
      mileage: Number(mileage), 
      totalCost: Math.round(stats.dailyTotal), 
      costPerKm: Number(stats.costPerKm.toFixed(2)) 
    };
    try {
      if (currentRouteId) {
        const res = await fetch(GAS_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
          body: JSON.stringify({ action: 'update', sheet: 'routes', id: currentRouteId, data: routeData }) 
        });
        if (!res.ok) throw new Error("Update failed");
        setCloudRoutes(cloudRoutes.map(r => r.id === currentRouteId ? { ...r, ...routeData } : r));
        showToast("已更新路線模型");
      } else {
        const newRoute = { id: `R-${Date.now()}`, ...routeData, createdAt: new Date().toLocaleString() };
        const res = await fetch(GAS_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
          body: JSON.stringify({ action: 'create', sheet: 'routes', data: newRoute }) 
        });
        if (!res.ok) throw new Error("Create failed");
        setCloudRoutes([newRoute, ...cloudRoutes]);
        setCurrentRouteId(newRoute.id);
        showToast("已建立並儲存新路線");
      }
    } catch (e) {
      showToast("雲端同步失敗", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(GAS_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: 'delete', sheet: 'routes', id: id }) 
      });
      if (!res.ok) throw new Error("Delete failed");
      setCloudRoutes(cloudRoutes.filter(r => r.id !== id)); 
      if (currentRouteId === id) handleNewRoute();
      showToast("已刪除模型");
    } catch (e) {
      showToast("刪除失敗", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-screen w-full max-w-4xl mx-auto bg-slate-950 relative shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {/* Continuous Ripple Effect */}
            <div className="absolute inset-0 bg-emerald-500/40 rounded-lg animate-ripple"></div>
            <div className="absolute inset-0 bg-emerald-500/20 rounded-lg animate-ripple [animation-delay:1s]"></div>
            
            {/* Syncing specific highlight */}
            {isSyncing && <div className="absolute -inset-1.5 bg-emerald-400 rounded-lg animate-pulse opacity-40 blur-sm"></div>}
            
            <div className="relative z-10 bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black text-[12px] px-2 py-1 rounded shadow-[0_0_8px_rgba(16,185,129,0.5)] tracking-widest border border-emerald-300">
              昶青
            </div>
          </div>
          <h1 className="font-bold text-white text-base tracking-wide flex items-center gap-1.5 ml-1">
            <Truck className="text-emerald-400" size={18}/>
            路線成本估算
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <span className="text-[10px] text-emerald-400 font-bold tracking-wider flex items-center gap-1.5 bg-emerald-900/40 px-2.5 py-1.5 rounded-full border border-emerald-500/40 shadow-sm animate-pulse">
              <Satellite size={12} className="animate-spin" /> 同步中...
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-bold tracking-wider flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1.5 rounded-full border border-slate-700/40">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse"></div> 已連線
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'model' && (
            <motion.div 
              key="model"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto hide-scrollbar pb-24"
            >
              {/* Sticky Cost Summary Card */}
              <div className="sticky top-0 z-20 p-3 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    {/* Single Trip */}
                    <div>
                      <div className="flex justify-between items-end mb-0.5">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">預估單趟總成本</p>
                        <p className="text-xs text-slate-500 font-mono text-right">{mileage} KM</p>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-black text-white font-mono tracking-tight">
                          <span className="text-lg text-slate-500 mr-1">$</span>
                          {Math.round(stats.dailyTotal).toLocaleString()}
                        </span>
                        <div className="text-right">
                          <span className="text-base font-bold text-blue-400 font-mono">${stats.costPerKm.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-500 ml-1">/KM</span>
                        </div>
                      </div>
                    </div>

                    {/* Return Trip */}
                    <div className="pt-1.5 border-t border-slate-800/50">
                      <div className="flex justify-between items-end mb-0.5">
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">預估來回趟總成本</p>
                        <p className="text-xs text-slate-500 font-mono text-right">{Number(mileage) * 2} KM</p>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-black text-slate-300 font-mono tracking-tight">
                          <span className="text-base text-slate-500 mr-1">$</span>
                          {Math.round(stats.dailyTotal * 2).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Interactive Pie Chart */}
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.breakdown.filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={50}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="label"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {stats.breakdown.map((entry, index) => {
                            // Extract hex color from tailwind class if possible, or use defaults
                            const colorMap: Record<string, string> = {
                              'bg-blue-500': '#3b82f6',
                              'bg-emerald-500': '#10b981',
                              'bg-amber-500': '#f59e0b',
                              'bg-rose-500': '#f43f5e',
                              'bg-slate-400': '#94a3b8',
                              'bg-cyan-500': '#06b6d4'
                            };
                            return <Cell key={`cell-${index}`} fill={colorMap[entry.color] || '#6366f1'} stroke="none" />;
                          })}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const percentage = ((data.value / stats.dailyTotal) * 100).toFixed(1);
                              return (
                                <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl">
                                  <p className="text-xs font-bold text-white flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${data.color}`}></span>
                                    {data.label}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    金額: <span className="text-white font-mono">${Math.round(data.value).toLocaleString()}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    佔比: <span className="text-white font-mono">{percentage}%</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Section: Route */}
                <section className="glass-card p-4 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2"><Route size={16}/> 路線選定</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setIsLocManagerOpen(true)} className="text-[10px] bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><MapPin size={12}/> 常用地點庫</button>
                      <button onClick={handleNewRoute} className="text-[10px] bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Plus size={12}/> 新增</button>
                      {currentRouteId && <button onClick={handleDeleteCurrent} className="text-[10px] bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Trash2 size={12}/> 刪除</button>}
                    </div>
                  </div>
                  
                  <datalist id="saved-locations-list">
                    {savedLocations.map((loc, idx) => <option key={idx} value={loc} />)}
                  </datalist>
                  
                  <datalist id="saved-routes-list">
                    {cloudRoutes.map((r, idx) => <option key={idx} value={r.name} />)}
                  </datalist>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <InputGroup label="路線名稱" type="text" icon={Tag} value={routeName} onChange={setRouteName} list="saved-routes-list" placeholder="例: 北高特急" />
                    <div className="mb-4">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 mb-1.5 block">快速載入歷史路線</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500"><FolderOpen size={16} /></div>
                        <select 
                          value={currentRouteId || ''} 
                          onChange={(e) => handleLoadRouteById(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-emerald-500 appearance-none text-base"
                        >
                          <option value="">-- 建立自訂新路線 --</option>
                          {cloudRoutes.map(r => (
                            <option key={r.id} value={r.id}>{r.name} ({r.origin} - {r.dest})</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500"><ChevronDown size={16} /></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 relative">
                    <InputGroup 
                      label="起點" 
                      type="text" 
                      value={startPoint} 
                      onChange={setStartPoint} 
                      list="saved-locations-list" 
                      onAddRight={addLocation} 
                      placeholder="輸入或下拉選擇起點..." 
                    />
                    
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      <div className="bg-slate-900 p-1.5 rounded-full border border-slate-700 text-slate-500 shadow-lg"><ArrowRight size={16}/></div>
                    </div>
                    
                    <div className="flex md:hidden items-center justify-center w-full text-slate-600 -my-4 z-10 relative pointer-events-none">
                      <div className="bg-slate-900 p-1 rounded-full"><ArrowDown size={14}/></div>
                    </div>

                    <InputGroup 
                      label="終點" 
                      type="text" 
                      value={endPoint} 
                      onChange={setEndPoint} 
                      list="saved-locations-list" 
                      onAddRight={addLocation} 
                      placeholder="輸入或下拉選擇終點..." 
                    />
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 items-end mt-2">
                    <div className="flex-1 w-full">
                      <InputGroup label="單趟里程 (KM)" value={mileage} onChange={setMileage} icon={Route} />
                      <div className="px-1 -mt-3 mb-4 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">來回里程</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">{Number(mileage) * 2} KM</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4 w-full md:w-auto">
                      <button 
                        onClick={() => {
                          if (!startPoint || !endPoint) return showToast("請先輸入起點與終點", "error");
                          window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startPoint)}&destination=${encodeURIComponent(endPoint)}&travelmode=driving`, '_blank');
                        }}
                        className="h-[46px] flex-1 md:flex-none px-4 bg-slate-800 text-blue-400 rounded-xl font-bold border border-slate-700 active:bg-slate-700 transition-colors shrink-0 flex items-center justify-center gap-2"
                        title="在 Google Maps 中查看路線"
                      >
                        <Navigation size={18}/>
                        核對
                      </button>
                      <button onClick={calculateDistance} disabled={isCalculating} className="h-[46px] flex-1 md:flex-none px-6 bg-slate-800 text-emerald-400 rounded-xl font-bold border border-slate-700 active:bg-slate-700 transition-colors shrink-0">
                        {isCalculating ? <RotateCcw size={18} className="animate-spin"/> : "算距"}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Section: Variables */}
                <section className="glass-card p-4 rounded-2xl">
                  <h2 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2"><Fuel size={16}/> 動態成本 (油資/耗損)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <InputGroup label="柴油 (NT$/L)" value={fuelPrice} onChange={setFuelPrice} step="0.1" />
                    <InputGroup label="油耗 (km/L)" value={fuelConsumption} onChange={setFuelConsumption} step="0.1" />
                    <InputGroup label="尿素比例 (%)" value={ureaRate} onChange={setUreaRate} step="0.1" />
                    <InputGroup label="保修 (NT$/KM)" value={maintenanceRate} onChange={setMaintenanceRate} step="0.1" />
                    <div className="md:col-span-2"><InputGroup label="E-tag (NT$/KM)" value={etagRate} onChange={setEtagRate} step="0.1" /></div>
                  </div>
                </section>

                {/* Section: Fixed */}
                <section className="glass-card p-4 rounded-2xl">
                  <h2 className="text-sm font-bold text-rose-400 mb-4 flex items-center gap-2"><Building2 size={16}/> 固定分攤成本</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <div className="md:col-span-2">
                      <InputGroup label="司機日薪 (NT$)" value={driverSalary} onChange={setDriverSalary} icon={User} />
                    </div>
                    <InputGroup label="月貸款" value={loan} onChange={setLoan} />
                    <InputGroup label="年保費" value={insurance} onChange={setInsurance} />
                    <div className="md:col-span-2">
                      <InputGroup label="年稅金" value={taxes} onChange={setTaxes} />
                    </div>
                  </div>
                </section>

                <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/50">
                  <CloudUpload size={20} /> {currentRouteId ? '更新路線模型' : '儲存路線模型'}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto hide-scrollbar p-4 pb-24"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Database className="text-emerald-400" size={20}/> 雲端已存模型</h2>
              <div className="space-y-4">
                {cloudRoutes.map(item => (
                  <div key={item.id} className="glass-card p-4 rounded-2xl relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => { handleLoadRouteById(item.id); setActiveTab('model'); }} className="p-2 text-slate-500 active:text-blue-400 bg-slate-900 rounded-full shadow"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 active:text-rose-400 bg-slate-900 rounded-full shadow"><Trash2 size={16}/></button>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-2 mr-16">{item.name}</h3>
                    <p className="text-xs text-slate-400 mb-3 bg-slate-900/50 inline-block px-2 py-1 rounded border border-slate-800">
                      {item.origin} <ArrowRight size={10} className="inline mx-1"/> {item.dest}
                    </p>
                    <div className="flex gap-4 border-t border-slate-700/50 pt-3 mt-1 mb-3">
                      <div><p className="text-[10px] text-slate-500 mb-0.5">總成本</p><p className="font-mono font-bold text-emerald-400">${item.totalCost?.toLocaleString()}</p></div>
                      <div><p className="text-[10px] text-slate-500 mb-0.5">均攤/KM</p><p className="font-mono font-bold text-blue-400">${item.costPerKm}</p></div>
                      <div><p className="text-[10px] text-slate-500 mb-0.5">里程</p><p className="font-mono font-bold text-slate-300">{item.mileage}KM</p></div>
                    </div>
                  </div>
                ))}
                {cloudRoutes.length === 0 && (
                  <div className="text-center py-20 text-slate-500">
                    <Inbox size={48} className="mb-4 block mx-auto opacity-50"/>
                    <p>尚無儲存的模型</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="h-[72px] pb-safe bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center px-2 shrink-0 z-50">
        <button onClick={()=>setActiveTab('model')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'model' ? 'text-emerald-400' : 'text-slate-500'}`}>
          <Calculator size={20} />
          <span className="text-[10px] font-bold">估算建模</span>
        </button>
        <button onClick={()=>setActiveTab('history')} className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'history' ? 'text-blue-400' : 'text-slate-500'}`}>
          <Database size={20} />
          <span className="text-[10px] font-bold">雲端紀錄</span>
        </button>
      </nav>

      {/* Location Manager Modal */}
      <AnimatePresence>
        {isLocManagerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[70vh]"
            >
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="text-white font-bold flex items-center gap-2 text-sm"><MapPin className="text-emerald-400" size={16}/> 管理常用地點庫</h3>
                <button onClick={() => setIsLocManagerOpen(false)} className="text-slate-400 hover:text-white p-1"><X size={20}/></button>
              </div>
              
              <div className="p-4 border-b border-slate-800 bg-slate-900 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={newLocationInput} 
                  onChange={(e) => setNewLocationInput(e.target.value)} 
                  onKeyPress={(e) => { if (e.key === 'Enter') { if (addLocation(newLocationInput)) setNewLocationInput(''); } }}
                  placeholder="手動輸入新地點..." 
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-all" 
                />
                <button 
                  onClick={() => { if (addLocation(newLocationInput)) setNewLocationInput(''); }} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20 whitespace-nowrap"
                >
                  新增
                </button>
              </div>

              <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><Info size={12}/> 從歷史報表萃取地點</span>
                <div className="flex gap-2">
                  <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-md">
                    {isImportingLocs ? <RotateCcw size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
                    匯入 XLS
                    <input type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleImportLocations} disabled={isImportingLocs} />
                  </label>
                </div>
              </div>

              <div className="p-4 overflow-y-auto hide-scrollbar flex-1 space-y-2 bg-slate-900">
                {savedLocations.length === 0 ? (
                  <p className="text-slate-500 text-center py-6 text-sm">尚無常用地點</p>
                ) : (
                  savedLocations.map((loc, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-300 text-sm font-medium">{loc}</span>
                      <button onClick={() => removeLocation(loc)} className="text-slate-500 hover:text-rose-400 p-2 bg-slate-900 rounded-lg transition-colors" title="移除"><Trash2 size={16}/></button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-16 left-1/2 z-[100] px-5 py-3 rounded-full shadow-2xl border text-sm font-bold flex items-center gap-2 whitespace-nowrap
              ${toast.type === 'error' ? 'bg-rose-900/90 border-rose-500 text-white' : 'bg-slate-800/90 border-emerald-500 text-emerald-400'}`}
          >
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />} 
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
