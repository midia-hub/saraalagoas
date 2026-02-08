// Stub para o build Next/Vercel: evita erro quando src/ (Vite legado) é compilado
// O Next não deve compilar src/ (pasta pages/ na raiz), mas este stub garante o build.
module.exports = {
  createClient: () => ({}),
}
