# DappSignal Registry

The public, reviewable project catalog for DappSignal. dApp teams propose a project by opening a pull request with a JSON manifest. A manifest becomes eligible for DappSignal after a maintainer reviews the project details and verifies its official links and chain addresses.

The application source code lives in a separate repository. This repository contains listing metadata only.

## Submit a project

1. Fork this repository.
2. Copy templates/project.template.json to projects/<slug>.json.
3. Fill in the project details, category, supported chains, and contract or program addresses.
4. Open a pull request and complete the listing checklist.
5. Maintainers review the submission. A merge records editorial approval; publication to DappSignal happens after the registry is connected to the application.

Use the category and chain IDs already defined in the schema. For each address, include the earliest block or slot that should be indexed when known. Never include RPC URLs, API keys, private keys, or other secrets.

## Review policy

Submissions are checked automatically for manifest shape, supported categories and chains, address format, duplicate slugs, and duplicate chain addresses. Maintainers also check that the project exists, official links belong to it, and submitted addresses match the project.

Passing automated checks does not mean a project is endorsed or published. A maintainer must review and merge the pull request. Project teams should describe their product accurately and disclose material risks on their own project pages.

## Repository layout

- projects/: reviewed project manifests.
- templates/: copyable submission template.
- project.schema.json: manifest format.
- scripts/validate-registry.mjs: dependency-free pull request validation.

## Local validation

Requires Node.js 20 or newer. Run:

    node scripts/validate-registry.mjs

The pull request workflow uses a GitHub-hosted runner, read-only repository permissions, and no secrets. Do not configure registry pull request workflows to run on self-hosted machines or with production credentials.

## Data reuse

Code in this repository is licensed under MIT; see LICENSE.

Project manifests in projects/ are licensed under CC BY 4.0; see DATA-LICENSE.md. This allows commercial reuse, including by competing services, when the required credit is given and changes are identified. Project names, logos, and trademarks remain the property of their respective owners; linking to a logo does not grant a license to reuse it.
