import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // react-three-fiber code mutates three.js objects imperatively (inside
    // useFrame and effects) by design; the React Compiler purity rules do not
    // apply to scene-graph objects.
    files: ["components/experience/StageCanvas.tsx", "components/three/**", "app/lab/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/use-memo": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".stills-tmp/**",
  ]),
]);

export default eslintConfig;
