import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aula Gratuita FSS',
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
    title: 'Aula Gratuita FSS',
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
      <body>
        {/* GTM-MK7SRXJ9 dispara o Meta Pixel (PageView) e captura o dataLayer */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MK7SRXJ9');`}
        </Script>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MK7SRXJ9"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  )
}
