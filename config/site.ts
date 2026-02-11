export const siteConfig = {
  name: "Sara Sede Alagoas",
  description: "Igreja Sara Nossa Terra - Sede Alagoas. Um lugar de transformação, crescimento e restauração através do amor de Cristo.",
  url: "https://sarasedealagoas.com.br",
  
  whatsappNumber: "5582999999999",
  whatsappMessages: {
    general: "Olá! Gostaria de falar com a Sara Sede Alagoas.",
    prayer: "Olá! Gostaria de fazer um pedido de oração.",
    cell: "Olá! Quero fazer parte de uma célula. Podem me orientar?",
    immersion: "Olá! Quero saber mais sobre a Revisão/Imersão e como participar.",
  },
  
  social: {
    instagram: "https://www.instagram.com/sarasedealagoas",
    youtube: "https://www.youtube.com/saraalagoas",
  },
  
  address: {
    street: "R. Costa Leite, 115",
    district: "Centro",
    city: "Maceió",
    state: "Alagoas",
    full: "R. Costa Leite, 115 - Centro - Maceió/Alagoas",
    mapUrl: "https://maps.app.goo.gl/rBwhqPTxaggT6UUNA",
    embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3933.0604442686976!2d-35.73489492425796!3d-9.666379990485847!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x7014503f7c3a8d5%3A0x8b0a9c2d0e8f5c0a!2sR.%20Costa%20Leite%2C%20115%20-%20Centro%2C%20Macei%C3%B3%20-%20AL!5e0!3m2!1spt-BR!2sbr!4v1234567890123!5m2!1spt-BR!2sbr",
  },
  
  /** Paths no bucket Storage "imagens" (ex: leadership/frank.jpg) */
  leadership: [
    {
      name: "Bispo Frank Guimarães",
      role: "Bispo Presidente",
      instagram: "https://www.instagram.com/bpfrankguimaraes/",
      image: "leadership/frank.jpg",
    },
    {
      name: "Bispa Betânia Guimarães",
      role: "Bispa",
      instagram: "https://www.instagram.com/bispabetaniaguimaraes/",
      image: "leadership/betania.jpg",
    },
  ],
  
  services: [
    {
      id: "terca",
      name: "Culto de Fé e Milagres",
      day: "Terça-feira",
      time: "19h30",
      type: "Presencial",
      description: "Uma noite de fé, milagres e transformação",
    },
    {
      id: "sabado",
      name: "Arena",
      day: "Sábado",
      time: "17h00",
      type: "Presencial",
      description: "Um culto especial para jovens e adolescentes",
    },
    {
      id: "domingo-manha",
      name: "Culto da Presença de Deus",
      day: "Domingo",
      time: "10h00",
      type: "Presencial",
      description: "Experimentando a presença de Deus de forma especial",
    },
    {
      id: "domingo-noite",
      name: "Culto da Família",
      day: "Domingo",
      time: "18h00",
      type: "Presencial",
      description: "Um culto pensado para toda a família",
    },
  ],
  
  mission: {
    short: "A Sara Nossa Terra nasceu em Brasília (DF), em 1992, fruto da palavra profética de Deus pregada por seus fundadores, Bispos Robson e Lúcia Rodovalho. A missão é fazer de cada pessoa um cristão, de cada cristão um discípulo e de cada discípulo um líder que impacta vidas e transforma comunidades através do amor de Cristo.",
    full: "A Sara Nossa Terra nasceu em Brasília (DF), em 1992, fruto da palavra profética de Deus pregada por seus fundadores, Bispos Robson e Lúcia Rodovalho. Desde então, a igreja tem se expandido por todo o Brasil e mundo, levando esperança e transformação.\n\nNossa missão é clara e poderosa: fazer de cada pessoa um cristão, de cada cristão um discípulo e de cada discípulo um líder que impacta vidas e transforma comunidades através do amor de Cristo.\n\nAcreditamos que cada pessoa tem um propósito divino e foi criada para fazer a diferença. Por isso, investimos em relacionamentos, discipulado e formação de líderes que multiplicam o Reino de Deus.\n\nNa Sara Sede Alagoas, você encontrará uma família que acolhe, apoia e caminha junto. Aqui é o seu lugar de pertencimento, crescimento e transformação.",
  },
  
  immersion: {
    title: "O que pode acontecer em 3 dias?",
    description: "Um encontro transformador de 3 dias que pode mudar sua vida. A Revisão/Imersão é um retiro espiritual intenso onde você experimentará restauração emocional, cura de feridas do passado e um novo começo com Deus.",
    features: [
      "Restauração emocional e espiritual",
      "Cura de feridas do passado",
      "Libertação e renovação da mente",
      "Fortalecimento da fé",
      "Comunhão profunda com Deus",
      "Relacionamentos restaurados",
    ],
    /** Paths no bucket Storage "imagens" */
    images: [
      "revisao/photo-1.JPG",
      "revisao/photo-2.JPG",
      "revisao/photo-3.JPG",
      "revisao/photo-4.JPG",
      "revisao/photo-5.JPG",
      "revisao/photo-6.JPG",
    ],
  },
  
  cell: {
    title: "Faça parte de uma Célula",
    description: "As células são o coração da Sara. São pequenos grupos que se reúnem em casas durante a semana para cultivar amizades, estudar a Palavra e crescer juntos na fé. É onde você encontra sua família espiritual.",
    benefits: [
      { 
        title: "Conexão", 
        description: "Relacionamentos verdadeiros e profundos com pessoas que se importam com você" 
      },
      { 
        title: "Crescimento", 
        description: "Desenvolvimento espiritual através do estudo bíblico e discipulado" 
      },
      { 
        title: "Comunidade", 
        description: "Um lugar de pertencimento onde você é conhecido, amado e apoiado" 
      },
    ],
  },
  
  kids: {
    title: "Sara Kids",
    description: "Um lugar especial para as crianças crescerem na fé de forma divertida e segura. Com atividades, músicas, histórias bíblicas e muito amor, seus filhos aprenderão sobre Jesus de um jeito que eles entendem.",
    features: [
      "Ambiente seguro e acolhedor",
      "Equipe treinada e dedicada",
      "Ensino bíblico apropriado para cada idade",
      "Atividades criativas e dinâmicas",
    ],
    /** Paths no bucket Storage "imagens" */
    images: [
      "kids/photo-1.jpg",
      "kids/photo-2.jpg",
    ],
  },
  
  offerings: {
    title: "Dízimos e Ofertas",
    description: "Sua contribuição é um ato de adoração e fé que nos permite continuar impactando vidas e transformando comunidades. Quando você oferta, está semeando no Reino de Deus e participando da obra que Ele está fazendo através da Sara Sede Alagoas.",
    url: "", // Deixar em branco por enquanto
  },
  
  menuItems: [
    { id: "cultos", label: "Cultos" },
    { id: "galeria", label: "Galeria" },
    { id: "celula", label: "Célula" },
    { id: "lideranca", label: "Liderança" },
    { id: "redes", label: "Redes" },
    { id: "oracao", label: "Pedido de Oração" },
    { id: "localizacao", label: "Onde Estamos" },
  ],
}
