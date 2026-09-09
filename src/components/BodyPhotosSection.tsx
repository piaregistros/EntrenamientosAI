import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image, Trash2, Maximize2, Loader, AlertTriangle, Plus, ChevronLeft, ChevronRight, User, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface BodyPhoto {
  id: string;
  user_id: string;
  date: string;
  month_key: string;
  angle: 'front' | 'side' | 'back';
  file_path: string;
  created_at: string;
}

interface SecureImageProps {
  photoId: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

function SecureImage({ photoId, alt, className, onClick }: SecureImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await apiFetch(`/api/body/photos/${photoId}/file`);
        if (!res.ok) throw new Error('Error al descargar archivo');
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (e) {
        console.error('Error loading secure image', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoId]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[160px] flex items-center justify-center bg-neutral-950 border border-neutral-900 rounded-xl">
        <Loader className="animate-spin text-lime-400" size={20} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center bg-neutral-950 border border-neutral-900 text-neutral-500 rounded-xl p-4 text-center">
        <AlertTriangle size={16} className="text-red-400 mb-1" />
        <span className="text-[10px] font-semibold text-neutral-400">Error al cargar</span>
      </div>
    );
  }

  return (
    <img
      src={src || ''}
      alt={alt}
      className={`${className} cursor-pointer hover:opacity-95 transition-opacity object-cover w-full h-full`}
      onClick={onClick}
    />
  );
}

interface BodyPhotosSectionProps {
  user: any;
}

export default function BodyPhotosSection({ user }: BodyPhotosSectionProps) {
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active target user for admin view
  const [targetUserId, setTargetUserId] = useState<string>(user.id);
  const isAdmin = user.role === 'admin';

  // Selected month for viewing/uploading
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Modal zoom
  const [zoomPhoto, setZoomPhoto] = useState<BodyPhoto | null>(null);

  // Refs for hidden file inputs
  const cameraInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  const galleryInputRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    fetchPhotos();
  }, [targetUserId]);

  const fetchPhotos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/body/photos?user_id=${targetUserId}`);
      if (!res.ok) throw new Error('Error al cargar historial de fotografías');
      const data = await res.json();
      setPhotos(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (angle: 'front' | 'side' | 'back', file: File) => {
    if (!file) return;

    setUploadingAngle(angle);
    setError(null);
    setSuccess(null);

    // Build correct date based on selectedMonth
    const today = new Date();
    const currentMonthKey = today.toISOString().slice(0, 7);
    
    let dateStr = '';
    if (selectedMonth === currentMonthKey) {
      // If uploading for current month, use today's full date
      dateStr = today.toISOString().split('T')[0];
    } else {
      // Use the 1st of the selected month
      dateStr = `${selectedMonth}-01`;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch(
        `/api/body/photos?user_id=${targetUserId}&date=${dateStr}&angle=${angle}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('Ya existe una fotografía para este ángulo en este mes.');
        }
        throw new Error(data.error || 'No se pudo subir la fotografía.');
      }

      setSuccess('¡Fotografía subida con éxito!');
      setPhotos((prev) => [...prev.filter((p) => !(p.month_key === selectedMonth && p.angle === angle)), data]);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la subida.');
    } finally {
      setUploadingAngle(null);
    }
  };

  const handleDelete = async (photo: BodyPhoto) => {
    if (!confirm('¿Seguro que deseas eliminar esta fotografía permanentemente?')) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/api/body/photos/${photo.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo eliminar el archivo.');
      }

      setSuccess('Fotografía eliminada con éxito.');
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar.');
    }
  };

  const handleReplace = async (angle: 'front' | 'side' | 'back', file: File, existingPhoto: BodyPhoto) => {
    if (!file) return;
    if (!confirm('Esta acción reemplazará la foto existente para este mes. ¿Deseas continuar?')) return;

    setError(null);
    setSuccess(null);
    setUploadingAngle(angle);

    try {
      // 1. Delete old photo
      const delRes = await apiFetch(`/api/body/photos/${existingPhoto.id}`, {
        method: 'DELETE',
      });
      if (!delRes.ok) {
        throw new Error('Error al eliminar la versión anterior.');
      }

      // 2. Upload new photo
      const today = new Date();
      const currentMonthKey = today.toISOString().slice(0, 7);
      let dateStr = '';
      if (selectedMonth === currentMonthKey) {
        dateStr = today.toISOString().split('T')[0];
      } else {
        dateStr = `${selectedMonth}-01`;
      }

      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await apiFetch(
        `/api/body/photos?user_id=${targetUserId}&date=${dateStr}&angle=${angle}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(data.error || 'Error al subir la nueva versión.');
      }

      setSuccess('Fotografía reemplazada con éxito.');
      setPhotos((prev) => [...prev.filter((p) => p.id !== existingPhoto.id), data]);
    } catch (err: any) {
      setError(err.message || 'Error al reemplazar la fotografía.');
      // Refresh list to ensure UI matches database state
      fetchPhotos();
    } finally {
      setUploadingAngle(null);
    }
  };

  const triggerInput = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      ref.current.click();
    }
  };

  const onFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    angle: 'front' | 'side' | 'back',
    existingPhoto?: BodyPhoto
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (existingPhoto) {
      handleReplace(angle, file, existingPhoto);
    } else {
      handleUpload(angle, file);
    }

    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  // Filter photos for selected month
  const monthPhotos = photos.filter((p) => p.month_key === selectedMonth);
  const photoByAngle = {
    front: monthPhotos.find((p) => p.angle === 'front'),
    side: monthPhotos.find((p) => p.angle === 'side'),
    back: monthPhotos.find((p) => p.angle === 'back'),
  };

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    return dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (increment: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + increment, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Admin Athlete Switcher */}
      {isAdmin && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lime-400">
            <User size={16} />
            <span className="text-xs font-black uppercase tracking-wider">Modo Entrenador: Seleccionar Atleta</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTargetUserId('pablo')}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all border ${
                targetUserId === 'pablo'
                  ? 'bg-lime-500/10 border-lime-500 text-lime-400'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Pablo (Admin)
            </button>
            <button
              onClick={() => setTargetUserId('estefi')}
              className={`py-2 px-3.5 rounded-xl text-xs font-extrabold transition-all border ${
                targetUserId === 'estefi'
                  ? 'bg-lime-500/10 border-lime-500 text-lime-400'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Estefi (Atleta)
            </button>
          </div>
        </div>
      )}

      {/* Month Navigator Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 hover:bg-neutral-850 hover:text-white rounded-xl transition-all text-neutral-400"
          style={{ minHeight: '38px', minWidth: '38px' }}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block mb-0.5">Mes de Seguimiento</span>
          <span className="text-sm font-black text-white capitalize">{getMonthLabel(selectedMonth)}</span>
        </div>

        <button
          onClick={() => changeMonth(1)}
          className="p-2 hover:bg-neutral-850 hover:text-white rounded-xl transition-all text-neutral-400"
          style={{ minHeight: '38px', minWidth: '38px' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-950/40 border border-red-900/50 text-red-300 p-4 rounded-xl text-xs flex gap-3">
          <AlertTriangle className="shrink-0 text-red-400 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 p-4 rounded-xl text-xs flex gap-3">
          <Sparkles className="shrink-0 text-lime-400" size={16} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-lime-400">
          <Loader className="animate-spin mb-3" size={24} />
          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Cargando fotografías...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {(['front', 'side', 'back'] as const).map((angle) => {
            const photo = photoByAngle[angle];
            const isAngleUploading = uploadingAngle === angle;

            const angleLabels = {
              front: 'Posición Frontal',
              side: 'Posición Lateral',
              back: 'Posición Trasera',
            };

            return (
              <div
                key={angle}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-neutral-400 uppercase tracking-wider">
                    {angleLabels[angle]}
                  </h4>
                  {photo && (
                    <span className="text-[8px] bg-neutral-950 border border-neutral-850 text-neutral-500 font-bold uppercase px-2 py-0.5 rounded">
                      Guardada
                    </span>
                  )}
                </div>

                {/* Picture Display Box */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center">
                  {isAngleUploading ? (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-lime-400 z-10">
                      <Loader className="animate-spin mb-2" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Subiendo archivo...</span>
                    </div>
                  ) : null}

                  {photo ? (
                    <>
                      <SecureImage
                        photoId={photo.id}
                        alt={`Evolución ${angleLabels[angle]}`}
                        onClick={() => setZoomPhoto(photo)}
                      />
                      <button
                        onClick={() => setZoomPhoto(photo)}
                        className="absolute bottom-2.5 right-2.5 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl transition-all hover:scale-105"
                        style={{ minHeight: '34px', minWidth: '34px' }}
                      >
                        <Maximize2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-1">
                      <div className="w-10 h-10 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
                        <Camera size={18} />
                      </div>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider pt-1">Sin fotografía</p>
                      <p className="text-[9px] text-neutral-600">Registra tu cambio físico de este mes</p>
                    </div>
                  )}
                </div>

                {/* Upload Control Inputs */}
                <input
                  type="file"
                  accept="image/*"
                  capture={angle === 'front' ? 'user' : 'environment'}
                  ref={cameraInputRefs[angle]}
                  onChange={(e) => onFileChange(e, angle, photo)}
                  className="hidden"
                />

                <input
                  type="file"
                  accept="image/*"
                  ref={galleryInputRefs[angle]}
                  onChange={(e) => onFileChange(e, angle, photo)}
                  className="hidden"
                />

                {/* Control Action Buttons */}
                {photo ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => triggerInput(galleryInputRefs[angle])}
                      disabled={isAngleUploading}
                      className="bg-neutral-950 border border-neutral-800 hover:border-lime-500/50 hover:text-lime-400 text-neutral-300 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      style={{ minHeight: '38px' }}
                    >
                      <Image size={14} />
                      <span>Sustituir</span>
                    </button>
                    <button
                      onClick={() => handleDelete(photo)}
                      disabled={isAngleUploading}
                      className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      style={{ minHeight: '38px' }}
                    >
                      <Trash2 size={14} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => triggerInput(cameraInputRefs[angle])}
                      disabled={isAngleUploading}
                      className="bg-neutral-950 border border-neutral-850 hover:border-lime-500/50 hover:text-lime-400 text-neutral-300 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      style={{ minHeight: '38px' }}
                    >
                      <Camera size={14} />
                      <span>Tomar foto</span>
                    </button>
                    <button
                      onClick={() => triggerInput(galleryInputRefs[angle])}
                      disabled={isAngleUploading}
                      className="bg-neutral-950 border border-neutral-850 hover:border-lime-500/50 hover:text-lime-400 text-neutral-300 font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      style={{ minHeight: '38px' }}
                    >
                      <Image size={14} />
                      <span>Elegir foto</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full screen view modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 pb-12 animate-fade-in">
          <div className="flex justify-between items-center pt-2">
            <div>
              <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest block">Vista Ampliada</span>
              <span className="text-xs text-neutral-400 font-semibold">{getMonthLabel(zoomPhoto.month_key)} · {zoomPhoto.angle === 'front' ? 'Frente' : zoomPhoto.angle === 'side' ? 'Perfil' : 'Espalda'}</span>
            </div>
            <button
              onClick={() => setZoomPhoto(null)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-full p-2"
              style={{ minHeight: '38px', minWidth: '38px' }}
            >
              <Plus size={18} className="rotate-45" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden my-4 rounded-2xl border border-neutral-900 bg-neutral-950 max-h-[70vh]">
            <SecureImage
              photoId={zoomPhoto.id}
              alt="Evolución Ampliada"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setZoomPhoto(null)}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs"
              style={{ minHeight: '44px' }}
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
