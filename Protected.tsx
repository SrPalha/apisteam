import React from "react";

export default function Protected() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ninja-dark via-ninja-blue to-ninja-green flex flex-col items-center justify-center p-6">
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white/10 rounded-2xl shadow-xl p-8 border-2 border-ninja-blue/30">
        <img
          src="/mascote-lupa.png"
          alt="Mascote Ninja com Lupa"
          className="w-40 h-40 drop-shadow-xl"
        />
        <div className="text-center md:text-left max-w-md">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 flex items-center gap-2">
            <span>🚫 Acesso restrito!</span>
          </h1>
          <p className="text-lg text-ninja-gray mb-4">
            Nossos ninjas estão de olho 👀<br />
            Só quem faz parte do time <span className="text-ninja-green font-bold">EloNinja</span> pode passar daqui.<br />
            Se você chegou até aqui por engano, volte para a área segura do site!
          </p>
        </div>
        <img
          src="/mascote-braco.png"
          alt="Mascote Ninja de Braços Cruzados"
          className="w-40 h-40 drop-shadow-xl"
        />
      </div>
      <p className="mt-8 text-ninja-blue font-semibold">Protegido por Ninja Security™</p>
    </div>
  );
} 