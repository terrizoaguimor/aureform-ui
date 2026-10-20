# Autenticación

Aureform incluye pantallas de inicio de sesión, registro, recuperación de contraseña y verificación. Su comportamiento predeterminado es una demostración local, incluidos los botones Google, GitHub y Microsoft. La demo pública no conecta cuentas, realiza OAuth ni crea sesiones de servidor.

## Revisa el comportamiento predeterminado

1. Abre una pantalla de autenticación desde la navegación principal o la galería de plantillas.
2. Prueba validación, visibilidad de contraseña, consentimiento de registro y mensajes de reintento.
3. Usa el código de demostración `123456` para explorar la interacción OTP.
4. Lee la indicación explícita de demo antes de continuar a la aplicación.

El adaptador predeterminado guarda únicamente los datos de perfil permitidos: `demo: true`, proveedor, nombre, email y fecha de creación. No almacena contraseñas, tokens de acceso ni cookies. Si falla el almacenamiento del navegador, usa la memoria del componente. Este perfil nunca acredita identidad ni permisos.

## Inyecta un callback de proveedor

[`AuthAdapter`](../../../src/lib/demo-auth.ts) tiene un método, `signInWithProvider`. Un componente cliente puede recibir la implementación de tu aplicación y pasarla a la plantilla existente:

```tsx
"use client";

import { AppPage } from "@/components/app-page";
import type {
  AuthAdapter,
  ProviderSignInHandler,
} from "@/lib/demo-auth";

export function SignInPage({ signIn }: { signIn: ProviderSignInHandler }) {
  const authAdapter: AuthAdapter = { signInWithProvider: signIn };
  return (
    <AppPage
      locale="es"
      path="auth/sign-in"
      authAdapter={authAdapter}
    />
  );
}
```

Aporta `signIn` desde tu integración cliente; este fragmento no implementa OAuth. También puedes pasar `onProviderSignIn={signIn}` a `AppPage`, `AuthTemplate` o `SocialAuth`. Ese callback tiene prioridad sobre `authAdapter`.

## Respeta el contrato del callback

El manejador recibe `{ provider, intent, consent, signal }`. Los proveedores son `google`, `github` o `microsoft`; la intención es `sign-in` o `sign-up`. El consentimiento de registro se valida antes de invocarlo. Respeta la cancelación antes de producir efectos y rechaza operaciones fallidas para mostrar el reintento.

Devuelve `{ kind: "handled" }` cuando tu aplicación gestiona el flujo. Solo confirma que terminó el callback; no autentica a nadie. No devuelvas credenciales como campos del perfil demo. Crea los adaptadores con funciones dentro del límite cliente, sin pasarlos desde un componente servidor.

## Completa la integración de producción

Tu aplicación gestiona el registro de proveedores, URLs de retorno, scopes, vinculación de cuentas, sesiones, autorización y redirecciones. El adaptador social no sustituye los flujos simulados de email/contraseña, recuperación u OTP; conéctalos por separado.

Consulta la [guía de integración](../../../docs/application-integrations.es.md), el [contrato tipado](../../../src/lib/demo-auth.ts), el [código de SocialAuth](../../../src/components/blocks/social-auth.tsx) y los [ejemplos cliente](../../../examples/ApplicationAdapters.tsx). Conserva etiquetas accesibles, estados pendientes y foco del consentimiento al adaptar las plantillas.
