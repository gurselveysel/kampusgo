import React from 'react';

export function InstitutionBrand({children}) {
  return <div className="institution-brand">
    <img src="/assets/gazi-logo.svg" alt="Gazi Üniversitesi amblemi" width="64" height="64"/>
    <div><strong>Gazi Üniversitesi</strong><span>Mikro Yeterlilik<br/>Yönetişim Sistemi</span></div>
    {children}
  </div>;
}

export function PlatformSignature({version,mode}) {
  return <div className="platform-signature" role="group" aria-label="Platform bilgisi">
    <img src="/assets/unigo-logo-tr.png" alt="ÜniGO" width="78" height="32"/>
    <div><strong>MYYS</strong><small>{version} · {mode}</small></div>
  </div>;
}
