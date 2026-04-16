import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Pencil, Check } from 'lucide-react'

export function DynamicSelect({
  value,
  onChange,
  items,
  onAdd,
  onEdit,
  onDelete,
  placeholder,
  defaultItems = [],
}: {
  value: string
  onChange: (v: string) => void
  items: any[]
  onAdd: (name: string) => Promise<void>
  onEdit?: (id: string, oldName: string, newName: string) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
  placeholder: string
  defaultItems?: string[]
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAdd = async () => {
    if (!newItem.trim()) return
    await onAdd(newItem.trim())
    setNewItem('')
    setIsAdding(false)
  }

  const handleEditSave = async (id: string, oldName: string) => {
    if (!editValue.trim() || editValue.trim() === oldName) {
      setEditingId(null)
      return
    }
    if (onEdit) await onEdit(id, oldName, editValue.trim())
    setEditingId(null)
  }

  return (
    <div className="flex gap-2 w-full">
      {isAdding ? (
        <div className="flex flex-1 gap-1 items-center animate-fade-in">
          <Input
            autoFocus
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Novo item..."
            className="h-10 border-[#C9922A]/30 focus-visible:ring-[#C9922A]"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 px-2 text-[#C9922A] hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
            onClick={handleAdd}
          >
            Salvar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsAdding(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="flex-1 h-10 border-[#C9922A]/30 focus:ring-[#C9922A]">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => {
                const isDefault = item.is_default || defaultItems.includes(item.nome)

                if (editingId === item.id) {
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 p-1"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-sm focus-visible:ring-[#C9922A]"
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(item.id, item.nome)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[#C9922A] hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
                        onClick={() => handleEditSave(item.id, item.nome)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:bg-muted"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                }

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-sm group relative"
                  >
                    <SelectItem
                      value={item.nome}
                      className="flex-1 cursor-pointer pr-16 border-none focus:bg-transparent"
                    >
                      {item.nome}
                    </SelectItem>
                    {!isDefault && (
                      <div className="absolute right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[#5A9FD4] hover:bg-[#5A9FD4]/10 hover:text-[#5A9FD4]"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setEditingId(item.id)
                              setEditValue(item.nome)
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-[#E84040] hover:bg-[#E84040]/10"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDelete(item.id, item.nome)
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-[#C9922A]/30 text-[#C9922A] hover:bg-[#C9922A]/10 hover:text-[#C9922A]"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}
