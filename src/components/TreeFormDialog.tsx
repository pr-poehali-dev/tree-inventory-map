import { useState, useRef } from 'react';
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
  SPECIES_GROUPS,
  STATUS_LABELS,
  CONDITION_LABELS,
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
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

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
      description: description.trim(),
      photoUrl,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Species */}
          <div className="grid gap-1.5">
            <Label>Порода / вид</Label>
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger className="border-[var(--forest-light)]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {SPECIES_GROUPS.map((group, gi) => (
                  <>
                    {gi > 0 && <SelectSeparator key={`sep-${gi}`} />}
                    <SelectGroup key={group.group}>
                      <SelectLabel className="flex items-center gap-1.5 text-[var(--forest-dark)] font-semibold bg-[var(--forest-pale)]/60 px-2 py-1.5">
                        <span>{group.icon}</span>
                        {group.group}
                      </SelectLabel>
                      {group.items.map(s => (
                        <SelectItem key={s} value={s} className="pl-6">{s}</SelectItem>
                      ))}
                    </SelectGroup>
                  </>
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
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div className="grid gap-1.5">
            <Label>Категория состояния</Label>
            <Select value={condition} onValueChange={v => setCondition(v as TreeCondition)}>
              <SelectTrigger className="border-[var(--forest-light)]/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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