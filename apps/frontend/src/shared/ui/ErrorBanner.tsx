interface ErrorBannerProps {
  message: string
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
      {message}
    </div>
  )
}
