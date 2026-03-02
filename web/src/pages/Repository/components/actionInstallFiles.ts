import actionDefinitionFile from "../../../../action/action.yml?raw";
import actionRuntimeFile from "../../../../action/index.cjs?raw";

export const ACTION_INSTALL_FILES = [
  {
    id: "action-yml",
    name: "action.yml",
    targetPath: ".github/actions/boris-bundle-tracker/action.yml",
    content: actionDefinitionFile,
    languageClass: "language-yaml",
  },
  {
    id: "index-js",
    name: "index.js",
    targetPath: ".github/actions/boris-bundle-tracker/index.js",
    content: actionRuntimeFile,
    languageClass: "language-javascript",
  },
] as const;
