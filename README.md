# projet-transversal-m1p12-backend

## Création d’un projet Node.js avec la dépendance MongoDB

Voici les étapes à suivre pour créer un projet Node.js et ajouter la dépendance MongoDB :

1. **Créer un nouveau dossier pour le projet**  
   ```bash
   mkdir mon-projet-node
   cd mon-projet-node
   ```

2. **Initialiser un projet Node.js**  
   Cette commande crée un fichier `package.json` interactif :
   ```bash
   npm init -y
   ```

3. **Installer la dépendance MongoDB**  
   Utilisez la commande suivante pour installer le package officiel MongoDB :
   ```bash
   npm install mongodb
   ```

4. **Créer un fichier principal (ex: `index.js`)**  
   ```bash
   touch index.js
   ```

5. **Exemple de connexion à MongoDB dans `index.js`**  
   Ajoutez ce code pour tester la connexion :
   ```js
   // index.js
   const { MongoClient } = require('mongodb');

   const uri = 'mongodb://localhost:27017';
   const client = new MongoClient(uri);

   async function run() {
     try {
       await client.connect();
       console.log('Connecté à MongoDB');
     } finally {
       await client.close();
     }
   }

   run().catch(console.dir);
   ```

6. **Lancer le projet**  
   ```bash
   node index.js
   ```

7. **(Optionnel) Ajouter un fichier `.gitignore`**  
   Pour ignorer le dossier `node_modules` :
   ```
   node_modules/
   ```

---
Tu as maintenant un projet Node.js prêt à utiliser MongoDB
