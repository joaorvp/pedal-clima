/// <reference lib="webworker" />
// Relógio da janela flutuante: num worker, o navegador não segura o ritmo como faz com a página em segundo plano.
setInterval(() => (self as unknown as DedicatedWorkerGlobalScope).postMessage(0), 1000)
