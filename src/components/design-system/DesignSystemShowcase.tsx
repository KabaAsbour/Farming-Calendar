import React, { useState } from 'react';
import { BrandLogo } from '../brand/BrandLogo.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge, StatusDot } from '../ui/Badge.tsx';
import { Card, CardHeader } from '../ui/Card.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Sprout, Calendar, Package, CheckCircle2, AlertTriangle, ShieldCheck, Download, Plus } from 'lucide-react';

export function DesignSystemShowcase() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('Parcelle K-01');

  const colorTokens = [
    { name: 'Deep Forest Green', hex: '#173F35', role: 'Couleur Principale / En-têtes & Sidebar' },
    { name: 'Agriculture Green', hex: '#2F7D4A', role: 'Actions Primaires / Succès Végétal' },
    { name: 'Fresh Growth Green', hex: '#77A96B', role: 'Accents / Croissance & Jalons' },
    { name: 'Warm Off-White', hex: '#F7F8F4', role: 'Surfaces de Fond Douces' },
    { name: 'Pure White', hex: '#FFFFFF', role: 'Surfaces Cartes & Tables (Light)' },
    { name: 'Charcoal Text', hex: '#202924', role: 'Typographie Principale Haute Lisibilité' },
    { name: 'Secondary Text', hex: '#66736B', role: 'Métadonnées & Labels Secondaires' },
    { name: 'Hairline Border', hex: '#E1E7E0', role: 'Diviseurs & Bordures Subtiles' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#E1E7E0] dark:border-[#24352C]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#173F35] text-[#77A96B]">
            DESIGN SYSTEM & COMPONENT SHOWCASE
          </span>
          <Badge variant="forest" size="xs">
            FARMING CALENDAR Enterprise UI Kit
          </Badge>
        </div>
        <h1 className="text-xl font-bold text-[#202924] dark:text-[#EEF4F0] mt-1">
          Spécifications du Système de Design & Primitives Graphiques
        </h1>
        <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5 max-w-3xl">
          Bibliothèque de tokens, typographie, hiérarchie de contrastes et composants réutilisables garantissant la cohérence à travers tous les modules agrobusiness.
        </p>
      </div>

      {/* 1. Brand Identity & Logo Variations */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#202924] dark:text-[#EEF4F0] font-mono">
          01. Identité de Marque & Emblème Vectoriel
        </h3>
        <Card padding="md" className="flex flex-wrap items-center gap-8">
          <div>
            <span className="text-[10px] text-[#8A988F] font-mono block mb-2">Version Complète Wordmark</span>
            <BrandLogo />
          </div>
          <div className="h-10 w-px bg-[#E1E7E0] dark:bg-[#283D33] hidden sm:block" />
          <div>
            <span className="text-[10px] text-[#8A988F] font-mono block mb-2">Version Compacte (Sidebar Réduite / Favicon)</span>
            <BrandLogo compact />
          </div>
        </Card>
      </section>

      {/* 2. Color Tokens */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#202924] dark:text-[#EEF4F0] font-mono">
          02. Nuancier Spécifié & Palette Agricole Restreinte
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {colorTokens.map((c) => (
            <div
              key={c.hex}
              className="p-3 rounded-xl border border-[#E1E7E0] dark:border-[#24352C] bg-white dark:bg-[#14201A] shadow-xs"
            >
              <div
                className="w-full h-12 rounded-lg border border-black/10 shadow-inner mb-2"
                style={{ backgroundColor: c.hex }}
              />
              <div className="font-semibold text-xs text-[#202924] dark:text-[#EEF4F0]">{c.name}</div>
              <div className="font-mono text-[10px] text-[#66736B] dark:text-[#9EB0A5]">{c.hex}</div>
              <div className="text-[9.5px] text-[#8A988F] mt-1 line-clamp-1">{c.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Button Hierarchy */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#202924] dark:text-[#EEF4F0] font-mono">
          03. Hiérarchie des Boutons d'Action (Anti-Slop Zero Pill)
        </h3>
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="forest" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              Bouton Forest (#173F35)
            </Button>
            <Button variant="primary" size="sm" icon={<Sprout className="w-3.5 h-3.5" />}>
              Action Primaire (#2F7D4A)
            </Button>
            <Button variant="secondary" size="sm">
              Secondaire Doux
            </Button>
            <Button variant="outline" size="sm">
              Contour Hairline
            </Button>
            <Button variant="ghost" size="sm">
              Fantôme / Discret
            </Button>
            <Button variant="danger" size="sm">
              Suppression Critique
            </Button>
          </div>

          <div className="pt-3 border-t border-[#E1E7E0] dark:border-[#24352C] flex items-center gap-3">
            <Button size="xs">Taille XS (28px)</Button>
            <Button size="sm">Taille SM (34px)</Button>
            <Button size="md">Taille MD (40px)</Button>
            <Button size="sm" loading>Chargement Asynchrone</Button>
          </div>
        </Card>
      </section>

      {/* 4. Badges & Metadata */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#202924] dark:text-[#EEF4F0] font-mono">
          04. Statuts Opérationnels & Métadonnées Typographiques
        </h3>
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="forest" size="sm">Agrobusiness Validé</Badge>
            <Badge variant="success" size="sm">Récolte Conforme (Grade A)</Badge>
            <Badge variant="warning" size="sm">Vigilance Irrigation</Badge>
            <Badge variant="error" size="sm">Quarantaine Phytosanitaire</Badge>
            <Badge variant="info" size="sm">Export Conakry</Badge>
            <Badge variant="neutral" size="sm">Non assigné</Badge>
          </div>

          <div className="pt-3 border-t border-[#E1E7E0] dark:border-[#24352C] flex items-center gap-6">
            <StatusDot status="success" label="Système & Base Connectés" />
            <StatusDot status="warning" label="Stock Intrants Faible" />
            <StatusDot status="error" label="Contrat en Retard" />
            <StatusDot status="info" label="Certification en cours" />
          </div>
        </Card>
      </section>

      {/* 5. Form Primitives */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#202924] dark:text-[#EEF4F0] font-mono">
          05. Champs de Saisie & Contrôles de Formulaire
        </h3>
        <Card padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Identifiant Parcelle"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              hint="Format cadastral Kindia"
            />
            <Select
              label="Spéculation Cultivée"
              options={[
                { value: 'PEPPER', label: 'Piment S17 / Habanero' },
                { value: 'CASSAVA', label: 'Manioc Bonoua' },
                { value: 'WATERMELON', label: 'Pastèque Kaolack' }
              ]}
            />
            <div>
              <label className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0] mb-1.5">
                Boîte de Dialogue Modale
              </label>
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => setDemoModalOpen(true)}
              >
                Tester Modal Standard
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Demo Modal */}
      <Modal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        title="Démonstration de Modalité Standard"
        subtitle="Fenêtre de dialogue accessible avec gestion du focus et touche Échap"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDemoModalOpen(false)}>Fermer</Button>
            <Button variant="primary" size="sm" onClick={() => setDemoModalOpen(false)}>Confirmer l'Action</Button>
          </div>
        }
      >
        <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] leading-relaxed">
          Cette boîte de dialogue illustre l'alignement strict avec le système de design : fond neutre doux, typographie contrastée, séparateur subtil et boutons fermement positionnés sans surcharge de badge.
        </p>
      </Modal>
    </div>
  );
}
