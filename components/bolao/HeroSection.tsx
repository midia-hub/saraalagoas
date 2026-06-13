import { MapPin, Clock, Instagram } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-green-950 via-green-900 to-green-800 text-white overflow-hidden">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-yellow-400 opacity-5" />
        <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full bg-green-400 opacity-10" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 rounded-full bg-yellow-300 opacity-5" />
        {/* Listras diagonais sutis */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)',
          }}
        />
      </div>

      <div className="relative px-4 py-14 max-w-lg mx-auto text-center">
        {/* Badge */}
        <span className="inline-block bg-yellow-400 text-green-950 text-xs font-black px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
          Arena Sede Maceió
        </span>

        {/* Bandeira do Brasil decorativa */}
        <div className="flex justify-center mb-5">
          <div className="relative w-20 h-14">
            <div className="absolute inset-0 rounded-md bg-green-500" />
            <div
              className="absolute inset-0 rounded-md"
              style={{ background: 'transparent' }}
            >
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-9"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  background: '#FFDF00',
                }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#002776]" />
            </div>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4 tracking-tight">
          Bolão Arena
          <br />
          <span className="text-yellow-400">da Copa</span>
        </h1>

        {/* Subtítulo */}
        <p className="text-green-200 text-base sm:text-lg mb-8 leading-relaxed max-w-sm mx-auto">
          Escolha sua equipe, dê seu palpite nos jogos do Brasil e ajude seu time a subir no ranking!
        </p>

        {/* CTA principal */}
        <a
          href="#palpitar"
          className="inline-block bg-yellow-400 text-green-950 font-black text-lg px-10 py-4 rounded-2xl hover:bg-yellow-300 active:scale-95 transition-all shadow-xl shadow-green-950/30"
        >
          Fazer meu palpite
        </a>

        {/* Informações do Arena */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-green-300">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-yellow-400 shrink-0" />
            Sara Sede Maceió
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} className="text-yellow-400 shrink-0" />
            Sábados às 17h
          </span>
          <a
            href="https://instagram.com/arenasedemaceio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <Instagram size={14} className="shrink-0" />
            @arenasedemaceio
          </a>
        </div>
      </div>
    </section>
  )
}
