import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
  icon?: ReactNode
  className?: string
}

export default function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={clsx('bg-white rounded-2xl p-6 shadow-sm border border-gray-100', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {delta && (
            <p
              className={clsx(
                'text-sm mt-1 font-medium',
                deltaPositive ? 'text-emerald-600' : 'text-red-500'
              )}
            >
              {deltaPositive ? '↑' : '↓'} {delta}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">{icon}</div>
        )}
      </div>
    </div>
  )
}
