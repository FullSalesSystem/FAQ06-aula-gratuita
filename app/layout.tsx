import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Estrutura Comercial do Zero | Aula Gratuita | Full Sales System',
  description:
    'Aprenda como construir um sistema comercial que gera R$1M–2M/mês com previsibilidade. Aula gratuita com Vinícius de Sá — fundador da Full Sales System, responsável por estruturar mais de 600 operações comerciais.',
  keywords: [
    'estrutura comercial',
    'sistema de vendas',
    'escalar negócio',
    'full sales system',
    'vinícius de sá',
    'aula gratuita vendas',
  ],
  openGraph: {
    title: 'Estrutura Comercial do Zero | Full Sales System',
    description:
      'O sistema exato que gerou R$25,2M em 2 anos. Aula gratuita com Vinícius de Sá.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
