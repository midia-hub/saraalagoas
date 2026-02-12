import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { siteConfig } from '@/config/site'

export const metadata = {
  title: `Como protegemos seus dados - ${siteConfig.name}`,
  description: 'Como protegemos seus dados - Sara Sede Alagoas',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sara-red hover:text-red-700 mb-8 transition-colors duration-300"
        >
          <ArrowLeft size={20} />
          <span>Voltar ao início</span>
        </Link>
        
        <h1 className="text-4xl font-bold text-sara-gray-dark mb-8">
          Como protegemos seus dados
        </h1>
        
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              O que é nossa Política de Privacidade
            </h2>
            <p>
              A Sara Sede Alagoas valoriza e protege a sua privacidade de todos os visitantes e membros. 
              Esta política de privacidade explica como coletamos, usamos e protegemos suas informações pessoais.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              2. Informações que Coletamos
            </h2>
            <p>
              Podemos coletar informações pessoais quando você:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Entra em contato conosco através do WhatsApp ou outros canais</li>
              <li>Participa de nossos cultos e eventos</li>
              <li>Se inscreve em nossas células ou ministérios</li>
              <li>Faz contribuições financeiras</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              3. Como Usamos suas Informações
            </h2>
            <p>
              Utilizamos suas informações para:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Responder às suas solicitações e pedidos de oração</li>
              <li>Manter você informado sobre eventos e atividades da igreja</li>
              <li>Administrar células e ministérios</li>
              <li>Processar contribuições financeiras</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              4. Proteção de Dados
            </h2>
            <p>
              Implementamos medidas de segurança adequadas para proteger suas informações pessoais 
              contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              5. Compartilhamento de Informações
            </h2>
            <p>
              Não vendemos, trocamos ou transferimos suas informações pessoais para terceiros, 
              exceto quando necessário para processar contribuições ou conforme exigido por lei.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              6. Seus Direitos
            </h2>
            <p>
              Você tem o direito de:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Acessar suas informações pessoais</li>
              <li>Solicitar correção de informações incorretas</li>
              <li>Solicitar a exclusão de suas informações</li>
              <li>Optar por não receber comunicações</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              7. Contato
            </h2>
            <p>
              Se você tiver dúvidas sobre esta política de privacidade ou sobre como tratamos suas informações, 
              entre em contato conosco através do WhatsApp: {siteConfig.whatsappNumber}
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-sara-gray-dark mb-4">
              8. Alterações nesta Política
            </h2>
            <p>
              Podemos atualizar esta política de privacidade periodicamente. 
              Recomendamos que você revise esta página regularmente para se manter informado sobre como protegemos suas informações.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
