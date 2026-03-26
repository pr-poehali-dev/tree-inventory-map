import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import {
  TreeMarker,
  TreeStatus,
  TreeCondition,
  TreeLifeStatus,
  SPECIES_GROUPS,
  STATUS_LABELS,
  CONDITION_LABELS,
  LIFE_STATUS_LABELS,
} from '@/types/tree';
import { SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<TreeMarker, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Partial<TreeMarker>;
  lat?: number;
  lng?: number;
}

export default function TreeFormDialog({ open, onClose, onSave, initialData, lat, lng }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [species, setSpecies] = useState(initialData?.species ?? SPECIES_GROUPS[0].items[0]);
  const [diameter, setDiameter] = useState(String(initialData?.diameter ?? 20));
  const [height, setHeight] = useState(String(initialData?.height ?? 8));
  const [count, setCount] = useState(String(initialData?.count ?? 1));
  const [age, setAge] = useState(String(initialData?.age ?? ''));
  const [status, setStatus] = useState<TreeStatus>(initialData?.status ?? 'good');
  const [condition, setCondition] = useState<TreeCondition>(initialData?.condition ?? 'healthy');
  const [lifeStatus, setLifeStatus] = useState<TreeLifeStatus>(initialData?.lifeStatus ?? 'alive');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl ?? '');
  const [addressLoading, setAddressLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? '');
      setSpecies(initialData?.species ?? SPECIES_GROUPS[0].items[0]);
      setDiameter(String(initialData?.diameter ?? 20));
      setHeight(String(initialData?.height ?? 8));
      setCount(String(initialData?.count ?? 1));
      setAge(String(initialData?.age ?? ''));
      setStatus(initialData?.status ?? 'good');
      setCondition(initialData?.condition ?? 'healthy');
      setLifeStatus(initialData?.lifeStatus ?? 'alive');
      setDescription(initialData?.description ?? '');
      setPhotoUrl(initialData?.photoUrl ?? '');

      const currentLat = lat ?? initialData?.lat;
      const currentLng = lng ?? initialData?.lng;

      if (initialData?.address) {
        setAddress(initialData.address);
      } else if (currentLat && currentLng && !initialData?.id) {
        setAddress('');
        setAddressLoading(true);
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentLat}&lon=${currentLng}&format=json&addressdetails=1&accept-language=ru`, {
          headers: { 'User-Agent': 'tree-inventory-map/1.0' }
        })
          .then(r => r.json())
          .then(data => {
            const a = data.address || {};
            const parts = [
              a.road || a.pedestrian || a.path || a.footway,
              a.house_number,
            ].filter(Boolean);
            if (parts.length > 0) setAddress(parts.join(', '));
            else if (data.display_name) setAddress(data.display_name.split(',').slice(0, 2).join(',').trim());
          })
          .catch(() => {})
          .finally(() => setAddressLoading(false));
      } else {
        setAddress(initialData?.address ?? '');
      }
    }
  }, [open, initialData?.id]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      lat: lat ?? initialData?.lat ?? 0,
      lng: lng ?? initialData?.lng ?? 0,
      name: name.trim(),
      species,
      diameter: Number(diameter),
      height: Number(height),
      count: Number(count),
      age: age ? Number(age) : undefined,
      status,
      condition,
      lifeStatus,
      address: address.trim(),
      description: description.trim(),
      photoUrl,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" style={{ overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle className="font-heading text-[var(--forest-dark)] flex items-center gap-2">
            <Icon name="TreePine" size={20} className="text-[var(--forest-mid)]" />
            {initialData?.id ? 'Редактировать дерево' : 'Новое дерево'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="name">Наименование *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Берёза №1"
              className="border-[var(--forest-light)]/40 focus:border-[var(--forest-mid)]"
            />
          </div>

          {/* Address */}
          <div className="grid gap-1.5">
            <Label htmlFor="address">Адрес расположения</Label>
            <div className="relative">
              <Input
                id="address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="ул. Ленина, 12"
                className="border-[var(--forest-light)]/40 focus:border-[var(--forest-mid)] pr-8"
              />
              {addressLoading && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <Icon name="Loader2" size={14} className="animate-spin text-[var(--stone)]" />
                </div>
              )}
            </div>
            {addressLoading && (
              <p className="text-[10px] text-[var(--stone)]">Определяю адрес по координатам…</p>
            )}
          </div>

          {/* Coordinates (read-only) */}
          <div className="grid gap-1.5">
            <Label>Координаты</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--forest-pale)]/50 border border-[var(--forest-light)]/30 rounded-md">
                <Icon name="Navigation" size={13} className="text-[var(--stone)] shrink-0" />
                <span className="text-xs text-[var(--stone)] font-mono">
                  {(lat ?? initialData?.lat ?? 0).toFixed(6)}
                </span>
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--forest-pale)]/50 border border-[var(--forest-light)]/30 rounded-md">
                <Icon name="Navigation" size={13} className="text-[var(--stone)] shrink-0" />
                <span className="text-xs text-[var(--stone)] font-mono">
                  {(lng ?? initialData?.lng ?? 0).toFixed(6)}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-[var(--stone)]">Координаты задаются кликом на карте</p>
          </div>

          {/* Species */}
          <div className="grid gap-1.5">
            <Label>Порода / вид</Label>
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger className="border-[var(--forest-light)]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72 z-[9999]" position="popper" sideOffset={4}>
                {SPECIES_GROUPS.map((group, gi) => (
                  <SelectGroup key={group.group}>
                    {gi > 0 && <SelectSeparator />}
                    <SelectLabel className="flex items-center gap-1.5 text-[var(--forest-dark)] font-semibold bg-[var(--forest-pale)]/60 px-2 py-1.5">
                      <span>{group.icon}</span>
                      {group.group}
                    </SelectLabel>
                    {group.items.map(s => (
                      <SelectItem key={s} value={s} className="pl-6">{s}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Diameter + Height */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="diameter">Диаметр ствола, см</Label>
              <Input
                id="diameter"
                type="number"
                min={1}
                value={diameter}
                onChange={e => setDiameter(e.target.value)}
                className="border-[var(--forest-light)]/40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="height">Высота, м</Label>
              <Input
                id="height"
                type="number"
                min={0.5}
                step={0.5}
                value={height}
                onChange={e => setHeight(e.target.value)}
                className="border-[var(--forest-light)]/40"
              />
            </div>
          </div>

          {/* Count + Age */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="count">Количество, шт</Label>
              <Input
                id="count"
                type="number"
                min={1}
                value={count}
                onChange={e => setCount(e.target.value)}
                className="border-[var(--forest-light)]/40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="age">Возраст, лет</Label>
              <Input
                id="age"
                type="number"
                min={1}
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="—"
                className="border-[var(--forest-light)]/40"
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid gap-1.5">
            <Label>Состояние</Label>
            <Select value={status} onValueChange={v => setStatus(v as TreeStatus)}>
              <SelectTrigger className="border-[var(--forest-light)]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Life status */}
          <div className="grid gap-1.5">
            <Label>Жизненное состояние</Label>
            <div className="flex gap-2">
              {(Object.entries(LIFE_STATUS_LABELS) as [TreeLifeStatus, string][]).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLifeStatus(k)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all
                    ${lifeStatus === k
                      ? k === 'alive'
                        ? 'bg-green-50 border-green-400 text-green-700'
                        : 'bg-gray-100 border-gray-400 text-gray-700'
                      : 'border-[var(--forest-light)]/40 text-[var(--stone)] hover:bg-[var(--forest-pale)]'
                    }`}
                >
                  <span>{k === 'alive' ? '🌿' : '🪵'}</span>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div className="grid gap-1.5">
            <Label>Категория состояния</Label>
            <Select value={condition} onValueChange={v => setCondition(v as TreeCondition)}>
              <SelectTrigger className="border-[var(--forest-light)]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="description">Примечание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Дополнительное описание..."
              rows={2}
              className="border-[var(--forest-light)]/40 resize-none"
            />
          </div>

          {/* Photo */}
          <div className="grid gap-1.5">
            <Label>Фотография</Label>
            {photoUrl ? (
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="preview"
                  className="w-full h-40 object-cover rounded-lg border border-[var(--forest-light)]/30"
                />
                <button
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 bg-white/90 rounded-full p-1 hover:bg-white"
                >
                  <Icon name="X" size={14} className="text-red-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-[var(--forest-light)]/40 rounded-lg hover:border-[var(--forest-mid)] hover:bg-[var(--forest-pale)]/30 transition-all"
              >
                <Icon name="Upload" size={24} className="text-[var(--forest-mid)]" />
                <span className="text-sm text-[var(--stone)]">Загрузить фото</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 bg-[var(--forest-mid)] hover:bg-[var(--forest-dark)] text-white"
          >
            <Icon name="Save" size={16} className="mr-1" />
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}