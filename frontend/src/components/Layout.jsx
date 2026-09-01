import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMailOpen, setIsMailOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [hospitalName, setHospitalName] = useState(() => {
    return localStorage.getItem('hospitalName') || 'Unit Radiologi TB Nasional';
  });
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  });
  const [picTimestamp, setPicTimestamp] = useState(Date.now());
  const itemRefs = useRef([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });

  const [topbarData, setTopbarData] = useState({
    highRiskUnreported: 0,
    incompleteCount: 0,
    latestLog: null,
    latestExams: []
  });

  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/topbar/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setTopbarData(result);
      }
    } catch (err) {
      console.error('Gagal memuat data notifikasi topbar:', err);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      setHospitalName(localStorage.getItem('hospitalName') || 'Unit Radiologi TB Nasional');
    };
    const handleProfilePicUpdate = () => {
      setUser(JSON.parse(localStorage.getItem('user') || '{}') || {});
      setPicTimestamp(Date.now());
    };
    window.addEventListener('hospitalNameChanged', handleUpdate);
    window.addEventListener('profilePicChanged', handleProfilePicUpdate);
    
    // Fetch notifications
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    return () => {
      window.removeEventListener('hospitalNameChanged', handleUpdate);
      window.removeEventListener('profilePicChanged', handleProfilePicUpdate);
      clearInterval(interval);
    };
  }, [token, location.pathname]);

  // Automatic scroll-reveal animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        root: null,
        threshold: 0.05,
        rootMargin: '0px 0px -20px 0px'
      }
    );

    const applyScrollReveal = () => {
      const selectors = [
        'main > div > *',
        '.grid > div',
        'table',
        'tbody tr',
        '.row-pop-in',
        '.bg-white.rounded-2xl',
        '.bg-white.rounded-xl',
        '.bg-surface-container-lowest',
        'form',
        '.print-card'
      ];
      
      const elements = document.querySelectorAll(selectors.join(', '));
      elements.forEach((el) => {
        // Skip elements inside modals or fixed overlays
        if (el.closest('.fixed')) return;

        if (el.tagName === 'TR') {
          if (!el.classList.contains('row-pop-in')) {
            el.classList.add('row-pop-in');
          }
          observer.observe(el);
          return;
        }

        if (!el.classList.contains('scroll-reveal')) {
          el.classList.add('scroll-reveal');
          // Add staggered delay for grid items
          if (el.parentElement && el.parentElement.classList.contains('grid')) {
            const childIndex = Array.from(el.parentElement.children).indexOf(el);
            if (childIndex > 0 && childIndex <= 4) {
              el.classList.add(`delay-stagger-${childIndex}`);
            }
          }
          observer.observe(el);
        }
      });
    };

    applyScrollReveal();
    const timeout = setTimeout(applyScrollReveal, 300);
    const timeout2 = setTimeout(applyScrollReveal, 800);
    const timeout3 = setTimeout(applyScrollReveal, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [location.pathname]);

  const role = user.role;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Define sidebar navigation menus based on role using Google Material Symbols
  const adminMenu = [
    {
      title: 'Dashboard',
      path: '/',
      icon: 'dashboard'
    },
    {
      title: 'Examination Data',
      path: '/examinations',
      icon: 'clinical_notes'
    },
    {
      title: 'Reporting',
      path: '/reports',
      icon: 'description'
    },
    {
      title: 'User Management',
      path: '/users',
      icon: 'group'
    },
    {
      title: 'Activity Logs',
      path: '/audit-logs',
      icon: 'history'
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: 'settings',
      isBottom: true
    }
  ];

  const radiographerMenu = [
    {
      title: 'Dashboard',
      path: '/',
      icon: 'dashboard'
    },
    {
      title: 'Examination Data',
      path: '/examinations',
      icon: 'clinical_notes'
    },
    {
      title: 'Profile',
      path: '/profile',
      icon: 'person',
      isBottom: true
    }
  ];

  const menuItems = role === 'admin' ? adminMenu : radiographerMenu;
  const topMenuItems = menuItems.filter(item => !item.isBottom);
  const bottomMenuItems = menuItems.filter(item => item.isBottom);

  // Generate avatar initials
  const initials = user.name 
    ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'U';

  const userRoleText = role === 'admin' ? 'Admin' : 'Radiografer';

  const notificationCount = (topbarData.highRiskUnreported > 0 ? 1 : 0) + 
                            (topbarData.incompleteCount > 0 ? 1 : 0) + 
                            (topbarData.latestLog ? 1 : 0);
  const mailCount = topbarData.latestExams ? topbarData.latestExams.length : 0;

  const activeTopIndex = topMenuItems.findIndex(item => isActive(item.path));
  const activeBottomIndex = bottomMenuItems.findIndex(item => isActive(item.path));

  // Adjust sidebar sliding indicator dynamically based on active item DOM measurements
  useEffect(() => {
    if (activeTopIndex !== -1 && itemRefs.current[activeTopIndex]) {
      const activeEl = itemRefs.current[activeTopIndex];
      setIndicatorStyle({
        top: activeEl.offsetTop,
        height: activeEl.offsetHeight
      });
    }
  }, [activeTopIndex, isSidebarCollapsed]);

  return (
    <div className="h-screen flex bg-surface-container-low text-on-background font-body-md relative overflow-hidden">
      
      {/* 1. Left SideNavBar (Desktop version) */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-full bg-primary text-on-primary border-r border-outline-variant flex-col py-6 z-20 no-print shadow-lg transition-all duration-300 ${
        isSidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
      }`}>
        {/* Sidebar Header */}
        <div className="px-4 mb-6 flex flex-col gap-4 shrink-0">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-3 overflow-hidden animate-in fade-in duration-300">
                <img 
                  src="/logo.jpg" 
                  alt="Logo Radiology TB" 
                  className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-sm shrink-0"
                />
                <div>
                  <div className="font-bold text-[16px] text-white tracking-wide leading-tight truncate">Radiology TB</div>
                  <div className="text-[10px] text-white/70 font-semibold tracking-wider uppercase mt-0.5 truncate">Clinical Precision</div>
                </div>
              </div>
            ) : (
              <img 
                src="/logo.jpg" 
                alt="Logo Radiology TB" 
                className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-sm shrink-0 cursor-pointer"
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  localStorage.setItem('sidebarCollapsed', 'false');
                }}
                title="Lebarkan Menu"
              />
            )}
            
            {!isSidebarCollapsed && (
              <button 
                onClick={() => {
                  const nextVal = !isSidebarCollapsed;
                  setIsSidebarCollapsed(nextVal);
                  localStorage.setItem('sidebarCollapsed', String(nextVal));
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer shrink-0"
                title="Kecilkan Menu"
              >
                <span className="material-symbols-outlined text-[18px]">menu_open</span>
              </button>
            )}
          </div>
          
          {isSidebarCollapsed && (
            <button 
              onClick={() => {
                const nextVal = !isSidebarCollapsed;
                setIsSidebarCollapsed(nextVal);
                localStorage.setItem('sidebarCollapsed', String(nextVal));
              }}
              className="w-10 h-10 mx-auto flex items-center justify-center hover:bg-white/10 rounded-xl text-white transition-colors cursor-pointer shrink-0"
              title="Lebarkan Menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
          )}
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto relative">
           {/* Sliding Highlight Indicator */}
          {activeTopIndex !== -1 && (
            <div 
              className={`absolute left-0 right-0 transition-all duration-300 ease-out pointer-events-none z-0 ${
                isSidebarCollapsed 
                  ? 'mx-2 rounded-xl bg-primary-container shadow-sm' 
                  : 'border-l-4 border-secondary-fixed bg-primary-container'
              }`}
              style={{
                height: `${indicatorStyle.height}px`,
                top: `${indicatorStyle.top}px`,
              }}
            />
          )}

          {topMenuItems.map((item, index) => {
            const active = isActive(item.path);
            return (
              <Link
                key={index}
                ref={el => itemRefs.current[index] = el}
                to={item.path}
                className={`flex items-center relative z-10 transition-all duration-250 ease-in-out ${
                  isSidebarCollapsed 
                    ? 'justify-center py-3 mx-2 rounded-xl px-0' 
                    : 'gap-3 px-6 py-3 border-l-4 border-transparent'
                } ${
                  active 
                    ? 'text-on-primary-container font-bold' 
                    : 'text-primary-fixed hover:bg-primary-container/40 hover:text-on-primary-container'
                }`}
                title={isSidebarCollapsed ? item.title : undefined}
              >
                <span 
                  className={`material-symbols-outlined ${active ? 'text-secondary-fixed' : ''}`}
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {!isSidebarCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}

          {/* Bottom aligned item */}
          <div className="mt-auto">
            {bottomMenuItems.map((item, index) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={index}
                  to={item.path}
                  className={`flex items-center transition-all duration-250 ease-in-out ${
                    isSidebarCollapsed 
                      ? 'justify-center py-3 mx-2 rounded-xl px-0' 
                      : 'gap-3 px-6 py-3 border-l-4 border-transparent'
                  } ${
                    active 
                      ? isSidebarCollapsed
                        ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                        : 'border-l-4 border-secondary-fixed bg-primary-container text-on-primary-container font-bold' 
                      : 'text-primary-fixed hover:bg-primary-container hover:text-on-primary-container'
                  }`}
                  title={isSidebarCollapsed ? item.title : undefined}
                >
                  <span 
                    className={`material-symbols-outlined ${active ? 'text-secondary-fixed' : ''}`}
                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed && <span className="truncate">{item.title}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Mobile Sidebar Navigation Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden no-print"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Left SideNavBar (Mobile version) */}
      <aside className={`
        fixed left-0 top-0 h-full w-[240px] bg-primary text-on-primary border-r border-outline-variant flex flex-col py-gap-lg z-40 md:hidden no-print transition-transform duration-350 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-margin-page mb-margin-page flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Logo Radiology TB" 
              className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-sm"
            />
            <div>
              <div className="font-bold text-[16px] text-white tracking-wide leading-tight">Radiology TB</div>
              <div className="text-[10px] text-white/70 font-semibold tracking-wider uppercase mt-0.5">Clinical Precision</div>
            </div>
          </div>
          <button 
            className="p-1 hover:bg-white/10 rounded-full text-white"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <nav className="flex-1 flex flex-col gap-base overflow-y-auto">
          {menuItems.map((item, index) => {
            const active = isActive(item.path);
            return (
              <Link
                key={index}
                to={item.path}
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 ease-in-out ${
                  active 
                    ? 'border-l-4 border-secondary-fixed bg-primary-container text-on-primary-container font-bold' 
                    : 'text-primary-fixed hover:bg-primary-container hover:text-on-primary-container border-l-4 border-transparent'
                }`}
              >
                <span 
                  className={`material-symbols-outlined ${active ? 'text-secondary-fixed' : ''}`}
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 2. Right Canvas Area */}
      <div className={`flex-grow flex flex-col h-screen min-w-0 bg-surface-container-low overflow-hidden relative transition-all duration-300 ${
        isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'
      }`}>
        


        {/* TopNavBar Integrated into Header */}
        <header className="sticky top-0 bg-white border-b border-border-crisp flex justify-between items-center h-20 px-margin-page w-full text-slate-800 z-30 pt-4 no-print shadow-sm">
          <div className="flex items-center gap-3 w-auto">
            <button 
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full transition"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            
            {/* Health Facility Name Text */}
            <div className="hidden md:flex items-center">
              <span className="font-black text-[25px] text-[#00475e] tracking-tight select-none">
                {hospitalName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-gap-md ml-auto">
            {/* Notification and Mail Buttons */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  setIsMailOpen(false);
                }}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer relative"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-status-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800">Notifikasi Baru</span>
                      {notificationCount > 0 && (
                        <span className="text-[10px] bg-red-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                          {notificationCount} Aktif
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                      {notificationCount === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-400 text-xs font-semibold">
                          Tidak ada notifikasi sistem baru.
                        </div>
                      ) : (
                        <>
                          {topbarData.highRiskUnreported > 0 && (
                            <div 
                              onClick={() => {
                                setIsNotificationOpen(false);
                                navigate('/examinations');
                              }}
                              className="px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
                            >
                              <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-rose-500 text-[18px] mt-0.5">error</span>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{topbarData.highRiskUnreported} Pasien Risiko Tinggi</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Kasus kritis membutuhkan pelaporan dan validasi segera.</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {topbarData.incompleteCount > 0 && (
                            <div 
                              onClick={() => {
                                setIsNotificationOpen(false);
                                navigate('/examinations');
                              }}
                              className="px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
                            >
                              <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">warning</span>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{topbarData.incompleteCount} Pemeriksaan Belum Lengkap</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Beberapa berkas laporan masih kekurangan data penunjang.</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {topbarData.latestLog && (
                            <div 
                              onClick={() => {
                                setIsNotificationOpen(false);
                                if (role === 'admin') navigate('/audit-logs');
                              }}
                              className="px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
                            >
                              <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">history</span>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">Aktivitas Sistem Terkini</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">User <strong>{topbarData.latestLog.username}</strong>: {topbarData.latestLog.activity}.</p>
                                  <p className="text-[9px] text-slate-400 font-semibold mt-1">
                                    {new Date(topbarData.latestLog.created_at + 'Z').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => {
                  setIsMailOpen(!isMailOpen);
                  setIsNotificationOpen(false);
                }}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer relative"
              >
                <span className="material-symbols-outlined text-[22px]">mail</span>
                {mailCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-status-green text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {mailCount}
                  </span>
                )}
              </button>

              {isMailOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMailOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800">Pesan & Rujukan</span>
                      {mailCount > 0 && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                          {mailCount} Baru
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                      {mailCount === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-400 text-xs font-semibold">
                          Tidak ada data rujukan TB masuk.
                        </div>
                      ) : (
                        topbarData.latestExams.map((exam) => (
                          <div 
                            key={exam.id} 
                            onClick={() => {
                              setIsMailOpen(false);
                              navigate(`/examinations/detail/${exam.id}`);
                            }}
                            className="px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
                          >
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">input</span>
                              <div>
                                <p className="text-xs font-bold text-slate-800">Rujukan: {exam.fasyankes_origin}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Skrining TB atas nama pasien: <strong>{exam.patient_name}</strong>.</p>
                                <p className="text-[9px] text-slate-400 font-semibold mt-1">
                                  {new Date(exam.created_at + 'Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {new Date(exam.created_at + 'Z').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative ml-gap-xs pl-gap-md border-l border-slate-200 flex items-center gap-3">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 cursor-pointer text-left focus:outline-none group p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <div className="font-label-caps text-label-caps text-slate-800 font-bold">{user.name || 'User'}</div>
                  <div className="font-body-md text-body-md text-slate-500 capitalize">{userRoleText}</div>
                </div>
                {user.profile_pic ? (
                  <img
                    src={`${user.profile_pic}?t=${picTimestamp}`}
                    alt="Foto Profil"
                    className="w-10 h-10 rounded-full border-2 border-secondary/20 shadow-sm group-hover:scale-105 group-hover:border-secondary transition-all object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold font-body-lg border-2 border-secondary/20 shadow-sm group-hover:scale-105 group-hover:border-secondary transition-all">
                    {initials}
                  </div>
                )}
              </button>

              {/* User Dropdown */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-36 w-52 bg-surface-container-lowest text-slate-800 rounded-lg shadow-xl border border-border-crisp py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-border-crisp sm:hidden">
                      <p className="text-sm font-semibold truncate text-text-primary">{user.name}</p>
                      <p className="text-xs text-text-muted capitalize">{userRoleText}</p>
                    </div>
                    <Link 
                      to={role === 'admin' ? '/settings' : '/profile'} 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-container transition w-full text-left font-medium"
                    >
                      <span className="material-symbols-outlined text-[20px] text-text-muted">person</span>
                      <span>{role === 'admin' ? 'Pengaturan' : 'Profil Saya'}</span>
                    </Link>
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error-container/20 transition w-full text-left border-t border-border-crisp font-bold cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Canvas Viewport */}
        <main className="relative z-10 h-[calc(100vh-5rem)] p-margin-page overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Pop-up Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowLogoutModal(false)} 
          />
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm sm:max-w-md w-full p-6 text-center relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">logout</span>
            </div>

            <h3 className="text-lg font-bold text-slate-800 tracking-tight">
              Yakin Ingin Keluar?
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 px-2 leading-relaxed">
              Sesi akun Anda saat ini akan diakhiri. Anda perlu memasukkan username dan kata sandi kembali untuk masuk ke sistem.
            </p>

            {/* User Details Pill */}
            <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
              {user.profile_pic ? (
                <img 
                  src={user.profile_pic} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 truncate">{user.name || user.username}</div>
                <div className="text-[10px] text-slate-400 font-semibold capitalize mt-0.5">{userRoleText} • {hospitalName}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition text-xs cursor-pointer"
              >
                Batal
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Ya, Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
