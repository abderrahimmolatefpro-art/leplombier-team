'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Client, User } from '@/types';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, MapPin, Users as UsersIcon, Edit } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [plombiers, setPlombiers] = useState<User[]>([]);
  const [teamLeader, setTeamLeader] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && projectId) {
      loadProject();
    }
  }, [user, authLoading, router, projectId]);

  const loadProject = async () => {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (!projectDoc.exists()) {
        router.push('/projets');
        return;
      }

      const projectData = {
        id: projectDoc.id,
        ...projectDoc.data(),
        startDate: projectDoc.data().startDate?.toDate() || new Date(),
        endDate: projectDoc.data().endDate?.toDate(),
        createdAt: projectDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: projectDoc.data().updatedAt?.toDate() || new Date(),
      } as Project;

      setProject(projectData);

      // Load client
      const clientDoc = await getDoc(doc(db, 'clients', projectData.clientId));
      if (clientDoc.exists()) {
        setClient({
          id: clientDoc.id,
          ...clientDoc.data(),
          createdAt: clientDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: clientDoc.data().updatedAt?.toDate() || new Date(),
        } as Client);
      }

      // Load plombiers
      const plombierPromises = projectData.plombierIds.map(async (id) => {
        const plombierDoc = await getDoc(doc(db, 'users', id));
        if (plombierDoc.exists()) {
          return {
            id: plombierDoc.id,
            ...plombierDoc.data(),
            createdAt: plombierDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: plombierDoc.data().updatedAt?.toDate() || new Date(),
          } as User;
        }
        return null;
      });

      const plombiersData = (await Promise.all(plombierPromises)).filter(
        (p) => p !== null
      ) as User[];
      setPlombiers(plombiersData);

      // Load team leader
      if (projectData.teamLeaderId) {
        const leaderDoc = await getDoc(doc(db, 'users', projectData.teamLeaderId));
        if (leaderDoc.exists()) {
          setTeamLeader({
            id: leaderDoc.id,
            ...leaderDoc.data(),
            createdAt: leaderDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: leaderDoc.data().updatedAt?.toDate() || new Date(),
          } as User);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (newProgress: number) => {
    if (!project) return;

    setUpdatingProgress(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        progress: newProgress,
        progressStatus: newProgress === 0 ? 'non_commence' : newProgress === 100 ? 'termine' : 'en_cours',
        updatedAt: Timestamp.now(),
      });
      setProject({ ...project, progress: newProgress });
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setUpdatingProgress(false);
    }
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

  if (!project) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-500">Projet introuvable</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/projets" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-1">
                {project.type === 'recherche_fuite' && 'Recherche de fuite'}
                {project.type === 'reparation_lourde' && 'Réparation lourde'}
                {project.type === 'renovation_salle_bain' && 'Rénovation salle de bain'}
              </p>
            </div>
          </div>
          <Link href={`/projets?edit=${project.id}`} className="btn btn-secondary flex items-center space-x-2">
            <Edit size={20} />
            <span>Modifier</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
            </div>

            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Suivi d'avancement</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression</span>
                    <span className="text-sm font-medium text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-primary-600 h-4 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => updateProgress(Math.max(0, project.progress - 10))}
                    disabled={updatingProgress || project.progress === 0}
                    className="btn btn-secondary"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => updateProgress(Math.min(100, project.progress + 10))}
                    disabled={updatingProgress || project.progress === 100}
                    className="btn btn-secondary"
                  >
                    +10%
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={project.progress}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateProgress(Math.max(0, Math.min(100, value)));
                    }}
                    className="input w-24"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    Statut: <span className="font-medium">{project.progressStatus}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informations</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Statut</span>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'en_cours'
                          ? 'bg-green-100 text-green-700'
                          : project.status === 'termine'
                          ? 'bg-gray-100 text-gray-700'
                          : project.status === 'en_attente'
                          ? 'bg-yellow-100 text-yellow-700'
                          : project.status === 'en_pause'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {project.status === 'en_cours' && 'En cours'}
                      {project.status === 'termine' && 'Terminé'}
                      {project.status === 'en_attente' && 'En attente'}
                      {project.status === 'en_pause' && 'En pause'}
                      {project.status === 'annule' && 'Annulé'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Calendar size={20} className="text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Date de début</span>
                    <p className="text-sm text-gray-900">{formatDate(project.startDate)}</p>
                  </div>
                </div>

                {project.endDate && (
                  <div className="flex items-start space-x-2">
                    <Calendar size={20} className="text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">Date de fin</span>
                      <p className="text-sm text-gray-900">{formatDate(project.endDate)}</p>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-gray-700">Durée estimée</span>
                  <p className="text-sm text-gray-900">{project.estimatedDuration} jour(s)</p>
                </div>

                <div className="flex items-start space-x-2">
                  <MapPin size={20} className="text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Adresse</span>
                    <p className="text-sm text-gray-900">{project.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {client && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Client</h2>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
                  {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
                  <p className="text-sm text-gray-600">
                    {client.address}, {client.postalCode} {client.city}
                  </p>
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Équipe</h2>
              <div className="space-y-4">
                {teamLeader && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Chef d'équipe</span>
                    <p className="text-sm text-gray-900 mt-1">{teamLeader.name}</p>
                    {teamLeader.phone && (
                      <p className="text-xs text-gray-600">{teamLeader.phone}</p>
                    )}
                  </div>
                )}

                {plombiers.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Plombiers</span>
                    <div className="mt-2 space-y-2">
                      {plombiers.map((plombier) => (
                        <div key={plombier.id} className="flex items-center space-x-2">
                          <UsersIcon size={16} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900">{plombier.name}</p>
                            {plombier.phone && (
                              <p className="text-xs text-gray-600">{plombier.phone}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
