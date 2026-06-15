# Agents

Les skills délèguent à des **subagents** : isolation de contexte (le verbeux reste chez
l'agent), parallélisme, et choix du modèle le moins cher capable de la tâche. Un agent ne
renvoie qu'un **digest compact** + écrit un contrat scratch sous `.snap/tmp/`.

Modèles : **haiku** (mécanique, sans jugement), **sonnet** (recherche/synthèse cadrée),
**opus** (planification, tradeoffs).

| Agent | Modèle | Skill(s) | Rôle en une ligne |
| --- | --- | --- | --- |
| [snap-drafter](#snap-drafter) | sonnet | define · ticket · wireframe · ds · design | Rédige un corps long d'entité depuis un template figé |
| [snap-loader](#snap-loader) | sonnet | define · ticket · develop · tests · qa · fulldev | Lit l'état d'un backend distant (MCP) → modèle d'entité normalisé |
| [snap-writer](#snap-writer) | haiku/sonnet | define · ticket · develop | Rend + persiste **une** entité (fichier ou MCP create/update) |
| [snap-linker](#snap-linker) | haiku | define · ticket (Notion) | Passe 2 : câble les relations natives Notion |
| [snap-provisioner](#snap-provisioner) | sonnet | init | Provisionne la structure d'un backend distant |
| [snap-digest](#snap-digest) | haiku | develop · review · tests · qa · fulldev | Condense un ticket + contexte produit en work-brief |
| [snap-explorer](#snap-explorer) | haiku | develop · tests · qa | Carte read-only du code (stack, fichiers impactés, runner) |
| [snap-docs](#snap-docs) | sonnet | develop | Réunit la doc des libs avant de coder (gate docs-readiness) |
| [snap-planner](#snap-planner) | opus | develop | Produit le plan d'implémentation (étapes, commits, risques) |
| [snap-developer](#snap-developer) | sonnet | develop | Exécute le plan : code, commit, push, PR/MR draft |
| [snap-reviewer-correctness](#snap-reviewer-correctness) | opus | review | Revue correctness (bugs, edge cases, CA) |
| [snap-reviewer-security](#snap-reviewer-security) | sonnet | review | Revue sécurité (injection, secrets, authz…) |
| [snap-reviewer-quality](#snap-reviewer-quality) | sonnet | review | Revue qualité (duplication, complexité, gaps de test) |
| [snap-reviewer-conventions](#snap-reviewer-conventions) | haiku | review | Revue conventions (lint/format du repo) |
| [snap-fixer](#snap-fixer) | sonnet | review (`--fix`) | Applique les findings `fixable` |
| [snap-tester](#snap-tester) | sonnet | tests | Écrit/répare les tests d'**un** niveau |
| [snap-test-triage](#snap-test-triage) | sonnet | tests | Classe chaque échec : test-bug vs source-bug |
| [snap-qa-validator](#snap-qa-validator) | sonnet | qa | Exerce les CA d'**une** surface contre l'app live |

---

## Produit & docs distantes

### snap-drafter
- **Modèle** : sonnet · **Skills** : `/define`, `/ticket`, `/wireframe`, `/ds`, `/design`
- **Rôle** : Rédige le corps Markdown long d'une entité produit (ex. le PRD d'une Feature
  `specified`) en suivant **exactement** la structure d'un template figé, remplissant les
  sections depuis un brief et marquant les manques en `> TODO:`. Décharge la rédaction
  lourde pour préserver le contexte principal.
- **Entrées** : type d'entité, template figé, brief structuré. **Sorties** : Markdown
  complet renvoyé (n'écrit aucun fichier lui-même).
- **Contraintes** : outils read-only (`Read`/`Grep`/`Glob`) — le caller écrit ; n'invente
  aucun fait ; n'ajoute/supprime/renomme aucune section de template.

### snap-loader
- **Modèle** : sonnet · **Skills** : `/define`, `/ticket` + lecture distante de `/develop`,
  `/tests`, `/qa`, `/fulldev`
- **Rôle** : Lit **une fois** un backend distant (Notion / Jira / GitHub Projects)
  via son MCP, normalise tous les items vers la forme canonique `{id, type, fm, body?,
  source}`, et écrit le JSON normalisé dans le scratch — isolant le payload MCP verbeux. Sert
  à la fois le raisonnement de la skill et le lint depuis un seul fetch.
- **Entrées** : `provider`, `domain`, locators de `snap.config.json`, flag `withBody`.
  **Sorties** : `.snap/tmp/state.json` (`{ entities, externalIds }`) + digest par entité.
- **Contraintes** : **une** passe de lecture, aucune écriture sur la plateforme ; ne lit ni
  n'émet de secret (le token vit dans le serveur MCP).

### snap-writer
- **Modèle** : haiku (task/bug) ou sonnet (epic/story/feature/PRD), choisi par le caller ·
  **Skills** : `/define`, `/ticket`, `/develop`
- **Rôle** : Rend le corps d'**une** entité depuis un template figé, puis le persiste via
  l'outil que le caller lui passe — `Write` pour un fichier repo, ou le create/update MCP du
  provider distant. En update : load-modify-write, en sautant la ré-écriture du corps si rien
  n'a changé (protège les blocs édités à la main).
- **Entrées** : type, template figé, brief structuré, cible de persistance. **Sorties** :
  manifeste compact (`{ id, op, target, ref }`) — jamais le corps rendu.
- **Contraintes** : exactement une entité, une persistance par spawn ; n'écrit que des liens
  key-texte canoniques (les relations natives sont câblées plus tard par `snap-linker`).

### snap-linker
- **Modèle** : haiku · **Skills** : `/define`, `/ticket` (**Notion uniquement**)
- **Rôle** : Passe 2 post-écriture pour Notion : une fois toutes les pages créées et leurs
  page-ids connus, résout les liens key-texte en page-ids et écrit les colonnes Relation
  natives (`rel_parents` / `rel_related`). Enrichit l'affichage sans toucher aux colonnes
  key-texte que lit le loader.
- **Entrées** : map clé → page-id (depuis les manifestes des writers), `parents`/`related`
  par entité, locators Notion. **Sorties** : manifeste (`{ linked, pages, unresolved }`).
- **Contraintes** : **idempotent** (re-run = no-op) ; ne touche jamais les colonnes key-texte
  ni le corps. Le provider repository saute cet agent.

### snap-provisioner
- **Modèle** : sonnet · **Skill** : `/snap:init`
- **Rôle** : Provisionne la structure d'un backend distant. Pour Notion : crée
  idempotemment les bases requises, la page Brief et la vue Roadmap (colonnes dont
  `snap_id`). Pour Jira / GitHub Projects : se connecte à un projet **existant** (aucune
  création) et confirme où vivra le `snap_id`.
- **Entrées** : `provider`, `domain`, emplacement parent (Notion) ou identifiant de projet
  existant. **Sorties** : `.snap/tmp/remote.json` (locators) + résumé créé vs déjà présent.
- **Contraintes** : **idempotent** (cherche avant de créer) ; n'écrit jamais de token ; les
  locators vont dans `snap.config.json` via `init-config.mjs` seulement.

---

## Développement (`/develop`)

### snap-digest
- **Modèle** : haiku · **Skills** : `/develop`, `/review`, `/tests`, `/qa`, `/fulldev`
- **Rôle** : Condense **un** ticket chargé et ses entités produit liées (Brief / Feature /
  Persona) en un `work-brief.json` synthétique. Garde la prose verbeuse dans son propre
  contexte pour que le reste du pipeline ne paie pas le coût des originaux.
- **Entrées** : fichier ticket ou `state.json` (distant), entités liées. **Sorties** :
  `.snap/tmp/work-brief.json` + digest 2-4 lignes.
- **Contraintes** : pas de subagent ; une passe lire-puis-écrire ; n'invente aucun fait
  manquant (laisse vide + note) ; n'émet aucun secret.

### snap-explorer
- **Modèle** : haiku · **Skills** : `/develop`, `/tests`, `/qa`
- **Rôle** : Scanne mécaniquement un repo cible pour détecter stack, conventions et runner
  de tests, puis identifie les fichiers impactés par le changement prévu. Garde les contenus
  de fichiers dans son contexte et ne rend qu'un digest + `codebase-map.json`.
- **Entrées** : `work-brief.json`, `projectDir`. **Sorties** :
  `.snap/tmp/codebase-map.json` + digest stack + nombre de fichiers impactés.
- **Contraintes** : **read-only** (seule écriture = le scratch JSON) ; une passe ; ne lit ni
  n'émet de secret (`.env`, tokens, clés).

### snap-docs
- **Modèle** : sonnet · **Skill** : `/develop`
- **Rôle** : Assemble le **bundle de doc** dont le developer a besoin avant de coder, par
  dégradation en 3 étapes : Context7 MCP → WebFetch → enregistrement de gap. Garde le texte
  de doc dans son contexte, n'émet que des `notes`/`snippets` distillés, et peuple `gaps[]`
  qui pilote le **gate docs-readiness** (une lib sans doc bloque le code).
- **Entrées** : `work-brief.json`, `codebase-map.json`. **Sorties** :
  `.snap/tmp/docs-bundle.json` + en-tête `libraries=N resolved=R gaps=G`.
- **Contraintes** : feuille (pas de subagent) ; les corps de doc restent en contexte ;
  idempotent ; n'émet aucun secret.

### snap-planner
- **Modèle** : opus · **Skill** : `/develop`
- **Rôle** : L'étape de **raisonnement et tradeoffs** du pipeline. Lit work-brief + carte du
  code + bundle de doc et produit un plan d'implémentation concret et ordonné : étapes, libs
  (source de vérité du gate docs-readiness), commits proposés, nom de branche, tests, risques.
- **Entrées** : `work-brief.json`, `codebase-map.json`, `docs-bundle.json`. **Sorties** :
  `.snap/tmp/plan.json` + résumé lisible.
- **Contraintes** : **planification seule** — ne touche jamais le code/git/PR/remote ;
  n'invente aucune lib ou chemin hors des 3 artefacts d'entrée.

### snap-developer
- **Modèle** : sonnet · **Skill** : `/develop`
- **Rôle** : Livre **un** ticket de bout en bout : valide le bundle de doc, checkout la
  branche de travail, implémente chaque étape du plan, commit en messages conventionnels,
  push, ouvre une **PR/MR draft** liant le ticket. Garde code, diffs et sorties de commande
  hors du contexte du caller.
- **Entrées** : `plan.json`, `docs-bundle.json`, `codebase-map.json`, host résolu,
  owner/repo, id ticket. **Sorties** : `.snap/tmp/manifest.json` (`op`:
  created/updated/error).
- **Contraintes** : jamais `git push --force` ; jamais de commit sur la branche par défaut ;
  PR/MR toujours `--draft`, jamais mergée ; **ne code jamais une lib absente du bundle de
  doc** ; n'écrit jamais de token.

---

## Revue (`/review`)

Les 4 reviewers tournent **en parallèle**, chacun sur une dimension, tous **read-only**
(seule écriture = leur `findings-*.json`). Aucun n'édite la source ni ne poste de commentaire
PR (la skill synthétise et livre).

### snap-reviewer-correctness
- **Modèle** : opus · **Skill** : `/review`
- **Rôle** : La dimension la plus exigeante. Traque bugs réels, erreurs de logique,
  off-by-one, null/undefined, races async/await, promesses non gérées, mauvais usage
  d'API/contrat, type mismatches, régressions. Quand un work-brief est présent, vérifie aussi
  que le changement **satisfait les critères d'acceptation**. Opus car la correctness demande
  le plus fort jugement.
- **Entrées** : `review-target.json`, `work-brief.json` (optionnel). **Sorties** :
  `findings-correctness.json` + digest de comptes par sévérité.

### snap-reviewer-security
- **Modèle** : sonnet · **Skill** : `/review`
- **Rôle** : Scanne le diff pour les vulnérabilités : injection (SQL/command/XSS), secrets
  commités, trous authn/authz, désérialisation unsafe, path traversal, SSRF, crypto/aléa
  faible, dépendances introduites manifestement vulnérables. Pas besoin de work-brief.
- **Entrées** : `review-target.json`. **Sorties** : `findings-security.json` + digest.
- **Note** : un secret trouvé est enregistré comme finding **sans en réafficher la valeur**.

### snap-reviewer-quality
- **Modèle** : sonnet · **Skill** : `/review`
- **Rôle** : Revue structurelle/maintenabilité : duplication (helpers existants ?),
  simplifications, lisibilité, sur/sous-abstraction, complexité, dette laissée. Signale les
  **gaps de test** manquants (mais n'écrit jamais les tests — c'est `/tests`).
- **Entrées** : `review-target.json`, `work-brief.json` (optionnel). **Sorties** :
  `findings-quality.json` + digest. Les gaps de test sont toujours `fixable: false`.

### snap-reviewer-conventions
- **Modèle** : haiku · **Skill** : `/review`
- **Rôle** : Le reviewer **mécanique** : confronte le diff aux conventions **propres au
  repo** (configs linter/formatter — eslint/prettier/ruff/editorconfig/rustfmt — style de
  commit, naming, ordre des imports, dead code). N'impose jamais de goût personnel.
- **Entrées** : `review-target.json`. **Sorties** : `findings-conventions.json` + digest.

### snap-fixer
- **Modèle** : sonnet · **Skill** : `/review --fix` (après validation du gate)
- **Rôle** : Applique uniquement les findings `fixable: true`, en éditions chirurgicales
  minimales. Mode `local` : laisse les changements dans le working tree. Mode `pr` : commit +
  push sur la branche existante de la PR. Les findings ambigus/jugement-design sont **skippés
  avec raison**, pas devinés.
- **Entrées** : `review-report.json`, `review-target.json`. **Sorties** :
  `.snap/tmp/fix-manifest.json` (`{ applied, skipped, commits, op }`).
- **Contraintes** : jamais de commit sur la branche par défaut (abort) ; jamais `--force` ;
  ne merge/approuve/ferme jamais, n'ouvre jamais de nouvelle PR/MR ; n'applique que les
  `fixable: true`.

---

## Tests (`/tests`)

### snap-tester
- **Modèle** : sonnet · **Skill** : `/tests` (un par niveau, en parallèle ; re-spawn en mode
  fix après triage)
- **Rôle** : Écrit ou répare les tests d'**un seul** niveau (unit/integration/e2e). En mode
  write, dérive la couverture des CA ou du diff et produit des fichiers idiomatiques au
  framework/naming/style d'assertion du repo. En mode fix, répare les test-bugs identifiés par
  le triage **sans jamais toucher la source**.
- **Entrées** : `level`, `tests-target.json`, `work-brief.json` (optionnel),
  `codebase-map.json`, `triage.json` (mode fix). **Sorties** : fichiers de test +
  `.snap/tmp/tests-<level>.json` + digest.
- **Contraintes** : n'édite/crée/supprime **jamais** de fichier source ; n'installe jamais un
  harness manquant en silence ; reste dans son niveau ; n'édite jamais la source pour faire
  passer un test.

### snap-test-triage
- **Modèle** : sonnet · **Skill** : `/tests` (à chaque run rouge)
- **Rôle** : Après une suite rouge, lit chaque test en échec **avec** la source qu'il exerce
  et classe l'échec : `test-bug` (le test est faux, source correcte → réparable par
  `snap-tester`) ou `source-bug` (le code viole vraiment un CA → sort de la boucle, retour
  `/develop`). Chaque `source-bug` **doit citer** le CA précis violé.
- **Entrées** : sortie de la suite (échecs + erreurs), `tests-target.json`,
  `tests-<level>.json`, `work-brief.json` (optionnel). **Sorties** :
  `.snap/tmp/triage.json` (`{ failures, counts }`).
- **Contraintes** : **read-only** ; n'édite ni source ni test ; ne recommande jamais d'éditer
  la source dans la boucle ; pas de CA cité = pas de classification `source-bug`.

---

## QA (`/qa`)

### snap-qa-validator
- **Modèle** : sonnet · **Skill** : `/qa` (un par surface active, en parallèle)
- **Rôle** : Exerce l'app **live** sur une surface assignée (web via agent-browser, api via
  curl, cli via le binaire produit), parcourt chaque CA **séquentiellement** (instance
  stateful), juge chacun `met` / `partial` / `unmet` avec preuve citée, et capture des
  fichiers de preuve. Renvoie une matrice de verdict.
- **Entrées** : `surface`, `baseUrl`, `qa-target.json`, `work-brief.json`,
  `codebase-map.json`. **Sorties** : `.snap/tmp/qa-<surface>.json` + preuves sous
  `.snap/tmp/qa-evidence/`.
- **Contraintes** : n'édite **jamais** de source ; ne boote/redémarre/teardown **jamais**
  l'app ; ne vise **jamais** une URL de prod ; CA injoignable = `notExercised`, jamais marqué
  `met` en silence ; n'émet aucun secret.
