export default function handler(req, res) {
  res.status(403).send(`
    <html style="background: #0C0E12; color: #fff; font-family: sans-serif;">
      <head>
        <title>Acesso restrito | EloNinja</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="background: linear-gradient(135deg, #0C0E12 60%, #2F99CA 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="display: flex; flex-direction: row; gap: 32px; align-items: center; background: rgba(255,255,255,0.07); border-radius: 24px; box-shadow: 0 8px 32px #0003; padding: 32px 24px; border: 2px solid #2F99CA55;">
          <img src=\"https://cs.eloninja.com.br/mascote-lupa.png\" alt=\"Mascote Ninja com Lupa\" style=\"width: 120px; height: 120px; border-radius: 16px; box-shadow: 0 2px 8px #0005; background: #fff2;\" />
          <div style="text-align: center; max-width: 320px;">
            <h1 style="font-size: 2rem; font-weight: bold; color: #fff; margin-bottom: 12px;">🚫 Acesso restrito!</h1>
            <p style="font-size: 1.1rem; color: #9DA3AE; margin-bottom: 8px;">
              Nossos ninjas estão de olho 👀<br />
              Só quem faz parte do time <span style=\"color: #80C020; font-weight: bold;\">EloNinja</span> pode passar daqui.<br />
              Se você chegou até aqui por engano, volte para a área segura do site!
            </p>
          </div>
          <img src=\"https://cs.eloninja.com.br/mascote-braco.png\" alt=\"Mascote Ninja de Braços Cruzados\" style=\"width: 120px; height: 120px; border-radius: 16px; box-shadow: 0 2px 8px #0005; background: #fff2;\" />
        </div>
        <p style="margin-top: 32px; color: #2F99CA; font-weight: 600;">Protegido por Ninja Security™</p>
      </body>
    </html>
  `);
} 