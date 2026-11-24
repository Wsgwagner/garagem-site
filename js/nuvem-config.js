/* nuvem-config.js
   Identificação do projeto no Firebase (Configurações do projeto → Seus apps → Web).
   Não é senha: quem protege os dados são o login e o arquivo firestore.rules.
   Com apiKey vazia a nuvem fica desligada e o app funciona só no aparelho. */

export const FIREBASE = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};
