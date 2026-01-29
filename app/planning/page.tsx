'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PlanningEntry, Project, User } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Calendar, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  getWeek,
  getDaysInMonth,
} from 'date-fns';

export default function PlanningPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [planningEntries, setPlanningEntries] = useState<PlanningEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plombiers, setPlombiers] = useState<User[]>([]);
  const [selectedPlombier, setSelectedPlombier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlanningEntry | null>(null);
  const [conflicts, setConflicts] = useState<Array<{ plombierId: string; date: Date; entries: PlanningEntry[] }>>([]);
  const [formData, setFormData] = useState({
    plombierId: '',
    projectId: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'project' as 'project' | 'congé' | 'indisponibilite',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    detectConflicts();
  }, [planningEntries]);

  const loadData = async () => {
    try {
      // Load planning entries
      const entriesQuery = query(collection(db, 'planning'));
      const entriesSnapshot = await getDocs(entriesQuery);
      const entriesData = entriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as PlanningEntry[];
      setPlanningEntries(entriesData);

      // Load projects
      const projectsQuery = query(collection(db, 'projects'));
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsData = projectsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Project[];
      setProjects(projectsData);

      // Load plombiers
      const plombiersQuery = query(collection(db, 'users'), where('role', '==', 'plombier'));
      const plombiersSnapshot = await getDocs(plombiersQuery);
      const plombiersData = plombiersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as User[];
      setPlombiers(plombiersData);

      if (user?.role === 'plombier') {
        setSelectedPlombier(user.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectConflicts = () => {
    const conflictsList: Array<{ plombierId: string; date: Date; entries: PlanningEntry[] }> = [];

    plombiers.forEach((plombier) => {
      const plombierEntries = planningEntries.filter((e) => e.plombierId === plombier.id);

      // Group by date
      const entriesByDate = new Map<string, PlanningEntry[]>();
      plombierEntries.forEach((entry) => {
        const dateKey = format(entry.date, 'yyyy-MM-dd');
        if (!entriesByDate.has(dateKey)) {
          entriesByDate.set(dateKey, []);
        }
        entriesByDate.get(dateKey)!.push(entry);
      });

      // Check for overlaps
      entriesByDate.forEach((entries, dateKey) => {
        if (entries.length > 1) {
          // Separate entries with and without times
          const entriesWithTime = entries.filter((e) => e.startTime && e.endTime);
          const entriesWithoutTime = entries.filter((e) => !e.startTime || !e.endTime);

          // If multiple entries without time on same day, it's a conflict
          if (entriesWithoutTime.length > 1) {
            conflictsList.push({
              plombierId: plombier.id,
              date: new Date(dateKey),
              entries: entriesWithoutTime,
            });
          }

          // Check for time overlaps
          if (entriesWithTime.length > 1) {
            // Sort by start time
            const sorted = entriesWithTime.sort((a, b) =>
              (a.startTime || '').localeCompare(b.startTime || '')
            );

            for (let i = 0; i < sorted.length - 1; i++) {
              const current = sorted[i];
              const next = sorted[i + 1];

              // Check if times overlap
              if (current.startTime && current.endTime && next.startTime && next.endTime) {
                if (current.endTime > next.startTime) {
                  conflictsList.push({
                    plombierId: plombier.id,
                    date: new Date(dateKey),
                    entries: [current, next],
                  });
                }
              }
            }
          }

          // If there are entries with time and without time on same day, check if they overlap
          if (entriesWithTime.length > 0 && entriesWithoutTime.length > 0) {
            // Consider it a potential conflict if there are entries without time
            // when there are already entries with time on the same day
            entriesWithoutTime.forEach((entryWithoutTime) => {
              entriesWithTime.forEach((entryWithTime) => {
                conflictsList.push({
                  plombierId: plombier.id,
                  date: new Date(dateKey),
                  entries: [entryWithoutTime, entryWithTime],
                });
              });
            });
          }
        }
      });
    });

    setConflicts(conflictsList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planning/page.tsx:149',message:'handleSubmit called',data:{hasStartTime:!!formData.startTime,hasEndTime:!!formData.endTime,type:formData.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      const entryData: any = {
        plombierId: formData.plombierId,
        projectId: formData.projectId || null,
        date: Timestamp.fromDate(new Date(formData.date)),
        type: formData.type,
        notes: formData.notes || '',
        createdAt: editingEntry ? editingEntry.createdAt : Timestamp.now(),
      };

      // Only include times if they are provided
      if (formData.startTime) {
        entryData.startTime = formData.startTime;
      }
      if (formData.endTime) {
        entryData.endTime = formData.endTime;
      }

      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planning/page.tsx:170',message:'Saving entry data',data:{entryData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (editingEntry) {
        await updateDoc(doc(db, 'planning', editingEntry.id), entryData);
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planning/page.tsx:175',message:'Entry updated',data:{entryId:editingEntry.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      } else {
        const newEntryRef = await addDoc(collection(db, 'planning'), entryData);
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planning/page.tsx:179',message:'Entry created',data:{entryId:newEntryRef.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }

      setShowModal(false);
      setEditingEntry(null);
      resetForm();
      loadData();
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planning/page.tsx:186',message:'handleSubmit completed successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'planning/page.tsx:189',message:'Error in handleSubmit',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error saving entry:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      await deleteDoc(doc(db, 'planning', id));
      loadData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      plombierId: selectedPlombier !== 'all' ? selectedPlombier : '',
      projectId: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'project',
      notes: '',
    });
  };

  // Navigation functions
  const navigatePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Date ranges based on view mode
  const getDateRange = () => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return { start: weekStart, end: weekEnd };
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start: weekStart, end: weekEnd };
    } else {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);
      return { start: dayStart, end: dayEnd };
    }
  };

  const { start: viewStart, end: viewEnd } = getDateRange();
  const weekDays = viewMode === 'month' 
    ? eachDayOfInterval({ start: viewStart, end: viewEnd })
    : viewMode === 'week'
    ? eachDayOfInterval({ start: viewStart, end: viewEnd })
    : [currentDate];

  const filteredEntries =
    selectedPlombier === 'all'
      ? planningEntries
      : planningEntries.filter((e) => e.plombierId === selectedPlombier);

  const getEntriesForDay = (day: Date, plombierId?: string) => {
    const entries = filteredEntries.filter((e) => {
      const matchesDate = isSameDay(e.date, day);
      const matchesPlombier = plombierId ? e.plombierId === plombierId : true;
      return matchesDate && matchesPlombier;
    });
    return entries;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '';
    return projects.find((p) => p.id === projectId)?.title || 'Projet inconnu';
  };

  const getPlombierName = (plombierId: string) => {
    return plombiers.find((p) => p.id === plombierId)?.name || 'Inconnu';
  };

  const hasConflict = (entry: PlanningEntry) => {
    return conflicts.some(
      (conflict) =>
        conflict.plombierId === entry.plombierId &&
        isSameDay(conflict.date, entry.date) &&
        conflict.entries.some((e) => e.id === entry.id)
    );
  };

  // Component Definitions
  const MonthView = ({
    currentDate,
    weekDays,
    filteredEntries,
    getEntriesForDay,
    getProjectName,
    getPlombierName,
    hasConflict,
    user,
    onEntryClick,
    onDayClick,
  }: any) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const firstDayOfWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
    const lastDayOfWeek = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const monthDays = eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek });
    
    // Group days by week
    const weeks: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }

    return (
      <div className="card p-0 overflow-hidden">
        {/* Mobile: Scroll horizontal pour le calendrier */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div key={day} className="p-2 md:p-3 text-center text-xs md:text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="divide-y divide-gray-200">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 divide-x divide-gray-200">
                  {week.map((day) => {
                    const dayEntries = getEntriesForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[80px] md:min-h-[120px] p-1 md:p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                          !isCurrentMonth ? 'bg-gray-50' : ''
                        } ${isToday ? 'bg-primary-50' : ''}`}
                        onClick={() => onDayClick(day)}
                      >
                        <div
                          className={`text-xs md:text-sm font-medium mb-1 ${
                            isToday
                              ? 'bg-primary-600 text-white rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center mx-auto'
                              : isCurrentMonth
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                        >
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5 md:space-y-1">
                          {dayEntries.slice(0, 2).map((entry: PlanningEntry) => {
                            const hasConflictEntry = hasConflict(entry);
                            return (
                              <div
                                key={entry.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEntryClick(entry);
                                }}
                                className={`text-[10px] md:text-xs p-0.5 md:p-1 rounded truncate cursor-pointer ${
                                  entry.type === 'congé'
                                    ? 'bg-red-100 text-red-700'
                                    : entry.type === 'indisponibilite'
                                    ? 'bg-orange-100 text-orange-700'
                                    : hasConflictEntry
                                    ? 'bg-yellow-200 text-yellow-900'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                                title={entry.projectId ? getProjectName(entry.projectId) : entry.type}
                              >
                                {entry.projectId ? getProjectName(entry.projectId) : entry.type}
                              </div>
                            );
                          })}
                          {dayEntries.length > 2 && (
                            <div className="text-[10px] md:text-xs text-gray-500 text-center">
                              +{dayEntries.length - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const WeekView = ({
    weekDays,
    filteredEntries,
    getEntriesForDay,
    getProjectName,
    getPlombierName,
    hasConflict,
    user,
    onEntryClick,
    onDelete,
  }: any) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-4">
        {weekDays.map((day: Date) => {
          const dayEntries = getEntriesForDay(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toISOString()}
              className={`card p-0 overflow-hidden ${
                isToday ? 'ring-2 ring-primary-500 shadow-lg' : ''
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-2 md:p-3 border-b ${
                  isToday
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="text-center">
                  <div
                    className={`text-xs md:text-sm font-medium ${
                      isToday ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {format(day, 'EEE')}
                  </div>
                  <div
                    className={`text-lg md:text-xl font-bold mt-1 ${
                      isToday ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              </div>

              {/* Day Entries */}
              <div className="p-2 md:p-3 min-h-[150px] md:min-h-[200px] space-y-2">
                {dayEntries.length === 0 ? (
                  <div className="text-center py-6 md:py-8 text-gray-400 text-xs md:text-sm">
                    Aucune entrée
                  </div>
                ) : (
                  dayEntries
                    .sort((a: PlanningEntry, b: PlanningEntry) => {
                      if (a.startTime && b.startTime) {
                        return a.startTime.localeCompare(b.startTime);
                      }
                      return a.createdAt.getTime() - b.createdAt.getTime();
                    })
                    .map((entry: PlanningEntry) => {
                      const projectName = entry.projectId
                        ? getProjectName(entry.projectId)
                        : null;
                      const plombierName =
                        user?.role === 'admin'
                          ? getPlombierName(entry.plombierId)
                          : null;
                      const hasConflictEntry = hasConflict(entry);

                      return (
                        <div
                          key={entry.id}
                          className={`group relative p-1.5 md:p-2 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                            entry.type === 'congé'
                              ? 'bg-red-50 border-red-500 hover:bg-red-100'
                              : entry.type === 'indisponibilite'
                              ? 'bg-orange-50 border-orange-500 hover:bg-orange-100'
                              : hasConflictEntry
                              ? 'bg-yellow-50 border-yellow-500 hover:bg-yellow-100'
                              : 'bg-blue-50 border-blue-500 hover:bg-blue-100'
                          }`}
                          onClick={() => onEntryClick(entry)}
                        >
                          {entry.startTime && entry.endTime && (
                            <div className="text-[10px] md:text-xs font-medium text-gray-600 mb-0.5 md:mb-1">
                              {entry.startTime} - {entry.endTime}
                            </div>
                          )}
                          {projectName && (
                            <div className="font-semibold text-gray-900 text-xs md:text-sm mb-0.5 md:mb-1 truncate">
                              {projectName}
                            </div>
                          )}
                          {plombierName && (
                            <div className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">
                              👤 {plombierName}
                            </div>
                          )}
                          {entry.type !== 'project' && (
                            <div
                              className={`inline-block px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-medium rounded mt-0.5 md:mt-1 ${
                                entry.type === 'congé'
                                  ? 'bg-red-200 text-red-800'
                                  : 'bg-orange-200 text-orange-800'
                              }`}
                            >
                              {entry.type === 'congé' ? 'Congé' : 'Indisponibilité'}
                            </div>
                          )}
                          {hasConflictEntry && (
                            <div className="mt-0.5 md:mt-1 flex items-center space-x-1 text-[10px] md:text-xs text-yellow-700">
                              <AlertTriangle size={10} className="md:w-3 md:h-3" />
                              <span>Conflit</span>
                            </div>
                          )}
                          <div className="absolute top-1 right-1 md:top-2 md:right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEntryClick(entry);
                              }}
                              className="p-0.5 md:p-1 bg-white rounded shadow-sm hover:bg-gray-100"
                              title="Modifier"
                            >
                              <Edit size={12} className="md:w-3.5 md:h-3.5 text-gray-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(entry.id);
                              }}
                              className="p-0.5 md:p-1 bg-white rounded shadow-sm hover:bg-red-100"
                              title="Supprimer"
                            >
                              <Trash2 size={12} className="md:w-3.5 md:h-3.5 text-red-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const DayView = ({
    currentDate,
    filteredEntries,
    getEntriesForDay,
    getProjectName,
    getPlombierName,
    hasConflict,
    user,
    onEntryClick,
    onDelete,
  }: any) => {
    const dayEntries = getEntriesForDay(currentDate);
    const isToday = isSameDay(currentDate, new Date());

    return (
      <div className="card">
        <div className={`p-3 md:p-4 border-b ${isToday ? 'bg-primary-600 text-white' : 'bg-gray-50'}`}>
          <div className="text-center">
            <div className={`text-xs md:text-sm font-medium ${isToday ? 'text-white' : 'text-gray-500'}`}>
              {format(currentDate, 'EEEE')}
            </div>
            <div className={`text-xl md:text-2xl font-bold mt-1 ${isToday ? 'text-white' : 'text-gray-900'}`}>
              {format(currentDate, 'd MMMM yyyy')}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          {dayEntries.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-gray-400">
              <Calendar size={40} className="md:w-12 md:h-12 mx-auto mb-3 md:mb-4 text-gray-300" />
              <p className="text-base md:text-lg">Aucune entrée pour ce jour</p>
            </div>
          ) : (
            dayEntries
              .sort((a: PlanningEntry, b: PlanningEntry) => {
                if (a.startTime && b.startTime) {
                  return a.startTime.localeCompare(b.startTime);
                }
                return a.createdAt.getTime() - b.createdAt.getTime();
              })
              .map((entry: PlanningEntry) => {
                const projectName = entry.projectId ? getProjectName(entry.projectId) : null;
                const plombierName = user?.role === 'admin' ? getPlombierName(entry.plombierId) : null;
                const hasConflictEntry = hasConflict(entry);

                return (
                  <div
                    key={entry.id}
                    className={`group relative p-3 md:p-4 rounded-lg border-l-4 transition-all hover:shadow-lg ${
                      entry.type === 'congé'
                        ? 'bg-red-50 border-red-500'
                        : entry.type === 'indisponibilite'
                        ? 'bg-orange-50 border-orange-500'
                        : hasConflictEntry
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                    onClick={() => onEntryClick(entry)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        {entry.startTime && entry.endTime && (
                          <div className="text-xs md:text-sm font-semibold text-gray-700 mb-1 md:mb-2">
                            🕐 {entry.startTime} - {entry.endTime}
                          </div>
                        )}
                        {projectName && (
                          <div className="text-base md:text-lg font-bold text-gray-900 mb-1 md:mb-2 break-words">
                            {projectName}
                          </div>
                        )}
                        {plombierName && (
                          <div className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
                            👤 {plombierName}
                          </div>
                        )}
                        {entry.type !== 'project' && (
                          <span
                            className={`inline-block px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium rounded-full mb-1 md:mb-2 ${
                              entry.type === 'congé'
                                ? 'bg-red-200 text-red-800'
                                : 'bg-orange-200 text-orange-800'
                            }`}
                          >
                            {entry.type === 'congé' ? 'Congé' : 'Indisponibilité'}
                          </span>
                        )}
                        {hasConflictEntry && (
                          <div className="mt-1 md:mt-2 flex items-center space-x-2 text-xs md:text-sm text-yellow-700">
                            <AlertTriangle size={14} className="md:w-4 md:h-4" />
                            <span>Conflit détecté</span>
                          </div>
                        )}
                        {entry.notes && (
                          <div className="mt-2 md:mt-3 text-xs md:text-sm text-gray-600 bg-white p-2 md:p-3 rounded border">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1 md:space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEntryClick(entry);
                          }}
                          className="p-1.5 md:p-2 bg-white rounded shadow-sm hover:bg-gray-100"
                          title="Modifier"
                        >
                          <Edit size={16} className="md:w-4.5 md:h-4.5 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(entry.id);
                          }}
                          className="p-1.5 md:p-2 bg-white rounded shadow-sm hover:bg-red-100"
                          title="Supprimer"
                        >
                          <Trash2 size={16} className="md:w-4.5 md:h-4.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Planning</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
              {user?.role === 'admin' ? 'Planning global' : 'Votre planning'}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingEntry(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Plus size={18} className="md:w-5 md:h-5" />
            <span className="text-sm md:text-base">Nouvelle entrée</span>
          </button>
        </div>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <div className="card bg-yellow-50 border border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900 mb-2">Conflits détectés</h3>
                <ul className="space-y-1 text-sm text-yellow-800">
                  {conflicts.map((conflict, idx) => (
                    <li key={idx}>
                      {getPlombierName(conflict.plombierId)} - {formatDate(conflict.date)} : chevauchement
                      d'horaires
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* View Selector and Navigation */}
        <div className="card">
          <div className="flex flex-col gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center justify-center md:justify-start">
              <div className="flex items-center space-x-1 md:space-x-2 bg-gray-100 p-0.5 md:p-1 rounded-lg w-full md:w-auto">
                <button
                  onClick={() => setViewMode('month')}
                  className={`flex-1 md:flex-none px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mois
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`flex-1 md:flex-none px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Semaine
                </button>
                <button
                  onClick={() => setViewMode('day')}
                  className={`flex-1 md:flex-none px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                    viewMode === 'day'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Jour
                </button>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              <div className="flex items-center justify-between md:justify-start space-x-2 md:space-x-4">
                <div className="flex items-center space-x-1 md:space-x-2">
                  <button
                    onClick={navigatePrevious}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Précédent"
                  >
                    <ChevronLeft size={18} className="md:w-5 md:h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={navigateToday}
                    className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    onClick={navigateNext}
                    className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Suivant"
                  >
                    <ChevronRight size={18} className="md:w-5 md:h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="text-sm md:text-lg font-semibold text-gray-900 text-center md:text-left">
                {viewMode === 'month'
                  ? format(currentDate, 'MMMM yyyy')
                  : viewMode === 'week'
                  ? `${format(viewStart, 'd MMM')} - ${format(viewEnd, 'd MMM yyyy')}`
                  : format(currentDate, 'EEEE d MMMM yyyy')}
              </div>
            </div>
          </div>

          {/* Plombier Filter (Admin only) */}
          {user?.role === 'admin' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <label className="text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">Plombier:</label>
                <select
                  value={selectedPlombier}
                  onChange={(e) => setSelectedPlombier(e.target.value)}
                  className="input w-full sm:w-auto"
                >
                  <option value="all">Tous</option>
                  {plombiers.map((plombier) => (
                    <option key={plombier.id} value={plombier.id}>
                      {plombier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Views */}
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            weekDays={weekDays}
            filteredEntries={filteredEntries}
            getEntriesForDay={getEntriesForDay}
            getProjectName={getProjectName}
            getPlombierName={getPlombierName}
            hasConflict={hasConflict}
            user={user}
            onEntryClick={(entry: PlanningEntry) => {
              setEditingEntry(entry);
              setFormData({
                plombierId: entry.plombierId,
                projectId: entry.projectId || '',
                date: format(entry.date, 'yyyy-MM-dd'),
                startTime: entry.startTime || '',
                endTime: entry.endTime || '',
                type: entry.type,
                notes: entry.notes || '',
              });
              setShowModal(true);
            }}
            onDayClick={(day: Date) => {
              setCurrentDate(day);
              setViewMode('day');
            }}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            weekDays={weekDays}
            filteredEntries={filteredEntries}
            getEntriesForDay={getEntriesForDay}
            getProjectName={getProjectName}
            getPlombierName={getPlombierName}
            hasConflict={hasConflict}
            user={user}
            onEntryClick={(entry: PlanningEntry) => {
              setEditingEntry(entry);
              setFormData({
                plombierId: entry.plombierId,
                projectId: entry.projectId || '',
                date: format(entry.date, 'yyyy-MM-dd'),
                startTime: entry.startTime || '',
                endTime: entry.endTime || '',
                type: entry.type,
                notes: entry.notes || '',
              });
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            filteredEntries={filteredEntries}
            getEntriesForDay={getEntriesForDay}
            getProjectName={getProjectName}
            getPlombierName={getPlombierName}
            hasConflict={hasConflict}
            user={user}
            onEntryClick={(entry: PlanningEntry) => {
              setEditingEntry(entry);
              setFormData({
                plombierId: entry.plombierId,
                projectId: entry.projectId || '',
                date: format(entry.date, 'yyyy-MM-dd'),
                startTime: entry.startTime || '',
                endTime: entry.endTime || '',
                type: entry.type,
                notes: entry.notes || '',
              });
              setShowModal(true);
            }}
            onDelete={handleDelete}
          />
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                  {editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                  {user?.role === 'admin' && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                        Plombier *
                      </label>
                      <select
                        required
                        value={formData.plombierId}
                        onChange={(e) => setFormData({ ...formData, plombierId: e.target.value })}
                        className="input text-sm md:text-base"
                      >
                        <option value="">Sélectionner un plombier</option>
                        {plombiers.map((plombier) => (
                          <option key={plombier.id} value={plombier.id}>
                            {plombier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as PlanningEntry['type'] })
                      }
                      className="input text-sm md:text-base"
                    >
                      <option value="project">Projet</option>
                      <option value="congé">Congé</option>
                      <option value="indisponibilite">Indisponibilité</option>
                    </select>
                  </div>

                  {formData.type === 'project' && (
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                        Projet
                      </label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                        className="input text-sm md:text-base"
                      >
                        <option value="">Aucun projet</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input text-sm md:text-base"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                        Heure de début <span className="text-gray-400 text-[10px] md:text-xs">(optionnel)</span>
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="input text-sm md:text-base"
                        placeholder="HH:mm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                        Heure de fin <span className="text-gray-400 text-[10px] md:text-xs">(optionnel)</span>
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="input text-sm md:text-base"
                        placeholder="HH:mm"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-500 -mt-1 md:-mt-2">
                    Les horaires sont optionnels. Laissez vide pour une entrée sans horaire spécifique.
                  </p>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input text-sm md:text-base"
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4 pt-3 md:pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingEntry(null);
                      }}
                      className="btn btn-secondary w-full sm:w-auto"
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn btn-primary w-full sm:w-auto">
                      {editingEntry ? 'Modifier' : 'Créer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
