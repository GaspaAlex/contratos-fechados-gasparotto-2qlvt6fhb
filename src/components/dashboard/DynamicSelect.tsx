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
import { Plus, X } from 'lucide-react'

export function DynamicSelect({
  value,
  onChange,
  items,
  onAdd,
  onDelete,
  placeholder,
  defaultItems = [],
}: {
  value: string
  onChange: (v: string) => void
  items: any[]
  onAdd: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  placeholder: string
  defaultItems?: string[]
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState('')

  const handleAdd = async () => {
    if (!newItem.trim()) return
    await onAdd(newItem.trim())
    setNewItem('')
    setIsAdding(false)
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
                const isDefault = defaultItems.includes(item.nome)
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-sm group relative"
                  >
                    <SelectItem
                      value={item.nome}
                      className="flex-1 cursor-pointer pr-8 border-none focus:bg-transparent"
                    >
                      {item.nome}
                    </SelectItem>
                    {!isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute right-2 z-10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete(item.id)
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
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
