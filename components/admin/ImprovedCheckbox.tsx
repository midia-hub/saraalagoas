'use client'

interface CheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  emoji?: string
  description?: string
  className?: string
}

export function FormCheckbox({ id, label, checked, onChange, emoji, description, className = '' }: CheckboxProps) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border-2 transition cursor-pointer ${
        checked
          ? 'border-[#c62737] bg-red-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${className} p-3`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-slate-300 text-[#c62737] focus:ring-[#c62737]/30 cursor-pointer accent-[#c62737]"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-lg">{emoji}</span>}
          <span className="font-medium text-slate-900">{label}</span>
        </div>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
      {checked && <div className="w-2 h-2 rounded-full bg-[#c62737]"></div>}
    </label>
  )
}

interface RadioGroupProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; emoji?: string }>
  label?: string
  className?: string
}

export function RadioGroup({ value, onChange, options, label, className = '' }: RadioGroupProps) {
  return (
    <fieldset className={className}>
      {label && <legend className="text-xs font-medium text-slate-700 mb-3">{label}</legend>}
      <div className="space-y-2">
        {options.map(option => (
          <label
            key={option.value}
            className={`flex items-center gap-3 rounded-lg border-2 transition cursor-pointer p-3 ${
              value === option.value
                ? 'border-[#c62737] bg-red-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name={option.value}
              value={option.value}
              checked={value === option.value}
              onChange={e => onChange(e.target.value)}
              className="w-5 h-5 text-[#c62737] focus:ring-[#c62737]/30 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              {option.emoji && <span className="text-lg">{option.emoji}</span>}
              <span className="font-medium text-slate-900">{option.label}</span>
            </div>
            {value === option.value && <div className="w-2 h-2 rounded-full bg-[#c62737]"></div>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
