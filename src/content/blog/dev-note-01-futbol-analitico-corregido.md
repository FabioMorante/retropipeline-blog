---
title: "Dev Note #01: reconstruyendo futbol-analitico (desde el extractor)"
description: "Primer avance del refactor de futbol-analitico: scraping, modelo base, auditoría y fallback multi-fuente para la poderosa Liga 1."
author: "AzaFrost"
heroImage: "../../../public/img/dev-notes/hero.png"
pubDate: 2026-04-26
updatedDate: 2026-04-26
tags: ["data engineering", "football analytics"]
---

Gran parte de la idea de tener **retropipeline.dev** es justamente no abandonar mis proyectos de ocio ni dejar mis notas botadas por ahí. Después de un mes con varias altas y bajas en lo anímico, decidí retomar `futbol-analitico` para aprender más sobre el arte de la data en este deporte y, de paso, ver si eventualmente puede servir como una puerta de entrada a más chamba relacionada con fútbol y datos.

Esta vez, eso sí, quise plantearlo con una idea más clara: dejar de tratarlo como un conjunto de notebooks exploratorios con containers porque sí (para flexear que sé algo de ciertos stacks, jeje) y convertirlo poco a poco en un proyecto reproducible de datos de fútbol.

La primera fase del refactor partió de una pregunta bastante simple: **¿puedo construir una base confiable de partidos y estadísticas de la Liga 1 de Perú sin depender de una API paga?**

Por ahora, la respuesta es: sí, pero con matices.

## Qué construí en esta primera fase

El primer objetivo fue armar el core de extracción. Para eso elegí **PromediosInfo** como fuente principal, porque permite obtener el fixture por jornadas y también acceder al detalle estadístico de varios partidos (sin problemas para scrapear en realidad).

Con eso ya se generan dos modelos base:

- `fct_match`: una fila por partido, con fecha, jornada, equipos, marcador, estado del partido y tarjetas.
- `fct_team_match`: dos filas por partido, una por equipo, con estadísticas como remates, posesión, pases, faltas, córners y tarjetas.

Se que los modelos son básicos y todavía no estoy en la parte bonita del análisis, pero antes de hablar de tendencias, estilos de juego o rendimiento, necesitaba asegurarme de que la base inicial tuviera sentido. Porque si la data nace mal, cualquier dashboard encima solo va a verse bonito mientras miente.

## El primer problema real: la fuente no siempre está completa

Durante las pruebas apareció el primer golpe de realidad: PromediosInfo no siempre trae estadísticas válidas para todos los partidos.

Encontré dos tipos de problemas (de momento):

1. Partidos donde el bloque de estadísticas existe, pero todos los valores aparecen en cero.
2. Partidos donde directamente no existe el bloque de estadísticas.

El primer caso era especialmente peligroso, porque un cero puede parecer un dato válido, pero en realidad podía representar ausencia de información. Si aceptaba esos ceros como datos reales, iba a contaminar cualquier análisis posterior.

De ahí salió una regla importante para el proyecto:

> No todo cero es un dato. A veces es simplemente una ausencia mal representada.

## Fallback con BeSoccer

Para no depender por completo de una sola fuente, probé **BeSoccer** como fuente secundaria.

La idea no fue reemplazar PromediosInfo, sino usar BeSoccer solo cuando la fuente principal fallara. Después de revisar su estructura, encontré que BeSoccer expone las jornadas mediante un endpoint AJAX y que las páginas de detalle tienen un bloque de estadísticas bastante útil.

Con ese fallback pude recuperar estadísticas para partidos donde PromediosInfo no tenía datos confiables.

Entonces por ahora, el flujo queda así:

1. PromediosInfo se usa como fuente principal.
2. Si PromediosInfo trae estadísticas válidas, se conservan.
3. Si PromediosInfo no trae estadísticas o trae placeholders en cero, se intenta recuperar el partido desde BeSoccer.
4. El resultado final conserva trazabilidad de la fuente usada.

Esto permitió completar la primera versión del extractor sin esconder los problemas de calidad de datos debajo de la alfombra.

## Auditoría de calidad

También implementé una primera auditoría reproducible. No es la parte más vistosa del proyecto, pero sí una de las más necesarias imo.

La auditoría revisa cosas básicas como:

- que cada partido tenga el número correcto de filas en `fct_team_match`
- que haya una fila local y una visitante
- que los goles coincidan entre `fct_match` y `fct_team_match`
- que los remates al arco no superen los remates totales
- que la posesión tenga rangos razonables
- que no existan partidos con todas las estadísticas en cero

La lógica es simple: si la auditoría falla, no tiene sentido construir visualizaciones encima. Primero se arregla la base; después se piensa en gráficos.

## Estado actual

La primera versión del extractor ya está funcionando.

Actualmente el proyecto puede correr:

```bash
python scripts/run_extract.py
python scripts/run_audit.py
```

La extracción genera archivos intermedios en `data/interim/` y la auditoría genera reportes en `data/audit/`.

Todavía no considero esto una versión analítica completa. Lo veo más como la primera base sólida: un extractor reproducible, con fallback y con controles mínimos de calidad.

## Qué sigue

El siguiente paso será construir la capa normalizada.

Eso implica:

- normalizar nombres de equipos
- crear IDs canónicos
- generar una capa `curated`
- ordenar columnas y tipos de datos
- dejar la base lista para métricas derivadas

Después de eso recién vendrá la parte más interesante: crear métricas por equipo, analizar forma reciente, comparar localía, volumen ofensivo, posesión, disciplina y otros patrones de rendimiento.

Por ahora, el avance importante es menos glamoroso, pero bastante necesario: el proyecto ya dejó de ser solo exploración y empezó a comportarse como un pipeline real.
