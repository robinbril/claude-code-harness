Before creating a new top-level code area, inspect the repository root. If no
`.project-structure.json` exists, create a small contract from
`.project-structure.example.json` with only the areas this project needs. Then
write its seam decisions in the configured boundary document and run
`node scripts/project-structure-check.js --repo .`.
