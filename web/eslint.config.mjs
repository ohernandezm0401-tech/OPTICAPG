import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    ignores: ['.agents/**', 'scripts/**', 'node_modules/**', '.next/**'],
  },
  {
    extends: [...next],
    rules: {
      // Reglas del React Compiler que trae eslint-config-next 16.
      // El código de los paneles es anterior a ese modo y Next.js va en 15.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]);
