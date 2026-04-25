# SKIINET ULTRAPLAN — De Dashboard a Plataforma de Referencia

> Research: Siriusware, RTP|One, Inntopia, Aspenware, SKIDATA, Catalate/Liftopia, Slope,
> Wintersteiger RENT, SkiSchoolPro, GoBook, Yoplanning, CheckYeti, Esquiades.com, Esquía.com
> Fecha: 24 abril 2026

---

## 📊 Estado Actual (41 modelos, 119 API routes, 22 pages)

### ✅ Lo que YA tenemos
| Área | Módulos | Competidor equivalente |
|------|---------|----------------------|
| CRM + Pipeline | GHL sync, contacts, conversations, deals | Inntopia CRM (parcial) |
| Reservas + Presupuestos | CRUD, calendar, voucher AI, Groupon | Siriusware POS (parcial) |
| Catálogo + Pricing | 93 productos, matrices temporada, bundles | Catalate (parcial) |
| Contabilidad | P&L, transacciones, liquidaciones proveedor | — (ninguno lo tiene bien) |
| White-label | Destinos, proveedores, categorías, branding | Aspenware (parcial) |
| Portal Proveedores | Auth PIN, dashboard, settlements | — (único en mercado) |
| Ops Calendar | Eventos, vistas mes/semana/día | — (Excel en la industria) |
| REAV Compliance | Registro, docs seguridad, incidentes | — (nadie lo automatiza) |
| Marketing | Campañas, templates, promociones | Inntopia Marketing Cloud |
| Storefront Público | Catálogo, booking requests, branding | Aspenware eCommerce |
| Plantillas Doc | Motor template, PDF/email, defaults | — |
| Reseñas | Ratings, moderación, public submission | CheckYeti (solo marketplace) |

### ❌ Lo que FALTA vs la industria (gaps críticos del research)

---

## 🔴 TIER 1 — Revenue-Critical (lo que cierra ventas)

### Phase 10: Motor de Inventario y Disponibilidad en Tiempo Real
**Gap:** Skiinet no tiene control de stock. Las agencias de ski comprueban disponibilidad por teléfono/email.
**Competidores:** Wintersteiger RENT, Siriusware

```
Modelos: InventoryItem, InventoryReservation, EquipmentSize
Features:
- Inventario por tipo (esquís, botas, cascos, snowboard) × talla × estación
- Reserva automática al crear reserva → decrementa stock
- Alertas de bajo stock
- Vista de disponibilidad en tiempo real por fecha+estación
- Sizing guide: edad + altura + peso → talla recomendada
- Estado: available, reserved, maintenance, retired
- Código de barras/RFID preparado (campo serialNumber)
```
**Impacto:** Sin esto, cada reserva requiere verificar manualmente si hay material. Bloquea escalado.

### Phase 11: Motor de Precios Dinámicos (Yield Management)
**Gap:** Los precios son estáticos por temporada. La industria usa pricing algorítmico.
**Competidores:** Catalate/Liftopia (el líder, powering 250+ resorts)

```
Modelos: PricingRule, PriceHistory
Features:
- Precio base × factor de demanda × antelación × ocupación
- Early bird: -20% si reserva >30 días antes
- Last minute: -10% si <48h y hay stock
- Precio sube cuando ocupación > 70%
- Reglas por destino, categoría, día de semana
- A/B testing de precios
- Dashboard de revenue por pricing rule
- Histórico de precios para análisis
```
**Impacto:** Catalate demuestra que dynamic pricing aumenta revenue 15-25% en ski.

### Phase 12: Checkout + Pagos Online (Redsys/Stripe)
**Gap:** La tienda pública acepta "booking requests" pero no procesa pago.
**Competidores:** Todos (Aspenware, Liftopia, Esquiades)

```
Modelos: PaymentIntent, PaymentTransaction
Features:
- Redsys integration (ya parcialmente hecho para reservas)
- Stripe como alternativa (tarjeta, Bizum via Stripe)
- Checkout completo: carrito → datos → pago → confirmación
- Aplicar códigos promo en checkout
- Split payments para grupos
- Recibos automáticos (usar template engine Phase 8)
- Webhook de confirmación → actualizar reserva + inventario
```
**Impacto:** Sin pago online, la tienda es un formulario de contacto glorificado.

---

## 🟡 TIER 2 — Operational Excellence (lo que diferencia)

### Phase 13: Gestión de Profesores y Escuela de Ski
**Gap:** Skiinet no gestiona instructores. Massive pain point según research.
**Competidores:** SkiSchoolPro, GoBook, Yoplanning

```
Modelos: Instructor, InstructorCertification, InstructorAvailability, 
         LessonBooking, StudentProfile
Features:
- Ficha instructor: nombre, certificaciones (TD1/TD2/TD3 AEPEDI), idiomas, especialidades
- Tracking de certificaciones: tipo, fecha emisión, caducidad, alertas renovación
- Calendario disponibilidad por instructor
- Auto-asignación: match instructor por idioma + nivel + disponibilidad
- Tipos clase: grupal (max alumnos), particular, adaptada
- Niveles alumno: debutante, intermedio, avanzado, experto (sistema AEPEDI)
- Progresión de alumnos entre sesiones
- Comisiones instructor: por clase, por tipo, liquidación mensual
- Ratio alumno/profesor configurable
```
**Impacto:** Las escuelas de ski son el 2º revenue stream. Sin esto, se gestiona en Excel + WhatsApp.

### Phase 14: Gestión de Material (Equipment Lifecycle)
**Gap:** Extensión del inventario — mantenimiento, fitting, historial.
**Competidores:** Wintersteiger RENT (líder, integrado con máquinas de tunning)

```
Modelos: EquipmentUnit, MaintenanceLog, DamageReport, FittingProfile
Features:
- Cada unidad individual: código barras, marca, modelo, temporada compra
- Log de mantenimiento: tunning, encerado, reparación, fecha, técnico
- Alertas de mantenimiento programado (cada X usos)
- Reporte de daños con severidad
- Perfil de fitting del cliente: guarda tallas para próxima visita
- Depreciación automática: valor residual por temporada
- Check-in / check-out de material por reserva
- Waiver digital (firma en pantalla) al recoger material
```
**Impacto:** Wintersteiger cobra €500+/mes por esto. Diferenciador masivo si lo incluimos.

### Phase 15: Channel Manager (Distribución Multi-Canal)
**Gap:** No hay forma de distribuir productos a otros canales.
**Competidores:** Inntopia (250+ resorts), Esquiades Pro

```
Modelos: Channel, ChannelMapping, ChannelSync
Features:
- Canales: Esquiades, Groupon, web propia, B2B partners, Google Things To Do
- Mapping de productos locales → producto en canal
- Sync de disponibilidad bidireccional
- Precios por canal (puede ser diferente del directo)
- Comisión por canal
- Overbooking prevention: stock compartido con locks
- Dashboard: revenue por canal, conversion rate
```
**Impacto:** Esquiades tiene ~35% del mercado español de ski. Poder sincronizar con ellos es table stakes.

---

## 🟢 TIER 3 — Platform Moat (lo que nos hace irreemplazables)

### Phase 16: App Móvil del Cliente (PWA)
**Gap:** Los clientes no tienen dónde ver su reserva, QR, instrucciones.
**Competidores:** Aspenware (app nativa, líder en UX móvil)

```
Features:
- PWA (no app store, instalar desde storefront)
- Mi reserva: QR code, detalles, material asignado, punto recogida
- Instrucciones pre-viaje: qué llevar, parking, horarios
- Push notifications: recordatorio 48h, cambios, ofertas
- Checkin digital: escanear QR al llegar → recogida express
- Historial de viajes + material
```

### Phase 17: Grupos y Colegios
**Gap:** Reservas de grupos (20-50 personas) son 100% manuales en toda la industria.
**Competidores:** Nadie lo hace bien (pain point universal)

```
Modelos: Group, GroupMember, GroupTemplate
Features:
- Crear grupo: nombre, organizador, tamaño estimado
- Lista de participantes con tallas (CSV import)
- Auto-sizing de material por edad+altura
- Presupuesto grupal automático: X alumnos × Y días × precio grupo
- Descuentos automáticos por volumen
- Pago parcial: señal + resto
- Coordinador del grupo: login limitado para gestionar lista
- Templates de grupo: "Colegio 30 niños 2 días" → pre-configurado
```
**Impacto:** Los colegios/empresas son clientes de alto valor pero huyen del proceso manual actual.

### Phase 18: Parte Meteorológica + Condiciones
**Gap:** Las decisiones de negocio dependen del tiempo y no hay integración.

```
Features:
- API meteo: OpenWeather o similar para cada destino
- Dashboard: previsión 7 días, estado nieve, riesgo aludes
- Auto-alertas a clientes si condiciones adversas
- Histórico de condiciones por fecha (correlacionar con ventas)
- Widget en storefront: estado actual de la estación
```

### Phase 19: Analytics Avanzados + BI
**Gap:** Los dashboards actuales muestran datos básicos.
**Competidores:** Inntopia Analytics (el gold standard en ski BI)

```
Features:
- Cohort analysis: clientes que repiten vs nuevos
- Revenue per available unit (RevPAU) — equivalente al RevPAR hotelero
- Customer Lifetime Value por segmento
- Forecasting: ML básico para predecir demanda
- Heatmaps: qué productos se venden juntos
- Funnel completo: visita storefront → request → reserva → review
- Export a Google Data Studio / Metabase
```

### Phase 20: API Pública + Marketplace
**Gap:** No hay forma de que terceros integren con Skiinet.

```
Features:
- REST API pública con API keys
- Docs con Swagger/OpenAPI auto-generados
- Webhooks salientes: nueva reserva, cambio estado, etc.
- SDK JavaScript para integrar en webs de terceros
- Marketplace de integraciones: Redsys, Stripe, Esquiades, Groupon, Google
- Widget embebible: "Reservar en [destino]" para webs de estaciones
```

---

## 🏗️ Priorización Recomendada

```
AHORA (revenue-critical, 0 workarounds):
  Phase 10: Inventario ← sin esto no escala
  Phase 12: Checkout + Pagos ← sin esto la tienda es inútil
  Phase 11: Precios Dinámicos ← 15-25% más revenue

PRÓXIMO (competitive advantage):
  Phase 13: Profesores/Escuela ← 2º revenue stream
  Phase 15: Channel Manager ← distribución = growth
  Phase 17: Grupos/Colegios ← alto valor, 0 competencia

DESPUÉS (platform moat):
  Phase 14: Equipment Lifecycle ← diferenciador vs Wintersteiger
  Phase 16: PWA Cliente ← experience layer
  Phase 18: Meteo ← nice to have con impacto
  Phase 19: Analytics BI ← data moat
  Phase 20: API Pública ← platform play
```

---

## 🎯 Insight Principal del Research

**El mercado de ski está donde la hostelería estaba en 2010.** Fragmentado, manual, sin estándares. Los líderes (Siriusware, RTP) son enterprise, caros, legacy. No existe un "Cloudbeds para ski". 

**Skiinet ya tiene más módulos integrados que cualquier competidor individual.** Pero le faltan los 3 pilares que hacen funcionar un negocio real: inventario, pagos, y distribución.

**El gap más grande del mercado europeo:** No hay un Catalate/Inntopia para Europa. Los forfaits no tienen API. Las estaciones españolas gestionan con Excel. Quien construya la capa de distribución de ski para Europa, gana.

---

## Métricas Actuales vs Objetivo

| Métrica | Actual | Post-ULTRAPLAN |
|---------|--------|----------------|
| Modelos Prisma | 41 | ~65 |
| API Routes | 119 | ~200 |
| Dashboard Pages | 22 | ~35 |
| Público Pages | 6 | ~12 |
| Revenue streams | Reservas | Reservas + Clases + Material + Canal |
| Proceso manual | Inventario, pagos, profesores | Solo excepciones |
