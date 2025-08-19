import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, TrendingUp, Users, DollarSign, FileText } from "lucide-react";

export const PolitiqueInvestissement = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/register')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Politique d'Investissement</h1>
              <p className="text-muted-foreground">
                Comprenez nos conditions et modalités d'investissement
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Avertissement Important */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-800">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Avertissement Important
                </CardTitle>
              </CardHeader>
              <CardContent className="text-amber-700">
                <p>
                  Tout investissement comporte des risques. La valeur de vos investissements peut augmenter ou diminuer. 
                  Vous pourriez récupérer moins que votre investissement initial. Il est important de comprendre les 
                  risques avant d'investir.
                </p>
              </CardContent>
            </Card>

            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Notre Politique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-justify text-xs sm:text-base">
                Bienvenue sur l’application web d’investissement par lots de la société InvestPro. La présente politique de confidentialité a pour objectif de vous expliquer de manière complète, approfondie, transparente et conforme aux réglementations nationales et internationales en matière de protection des données personnelles, la façon dont nous collectons, utilisons, traitons, conservons, partageons et sécurisons vos données à caractère personnel dans le cadre de votre utilisation de notre plateforme. La confidentialité et la protection des données ne sont pas seulement des obligations légales pour nous, elles sont une priorité fondamentale au cœur de notre éthique d’entreprise.

                Cette politique s’applique à toutes les données personnelles collectées sur notre application web, accessibles depuis tout appareil connecté (ordinateur, smartphone, tablette) et via tous les services fournis par InvestPro , que vous soyez un simple visiteur, un utilisateur enregistré (investisseur), un agent en charge de la validation des transactions, ou un administrateur disposant de privilèges étendus.

                En accédant ou en utilisant notre plateforme, vous reconnaissez avoir pris connaissance de cette politique de confidentialité et vous acceptez les termes et pratiques qu’elle décrit. Si vous êtes en désaccord avec une quelconque disposition, nous vous invitons à cesser l’utilisation de nos services. Nous nous réservons le droit de modifier cette politique à tout moment ; vous serez informé en cas de modifications significatives.


                1. types de données perso  collectées
                Nous collectons différents types de données selon votre niveau d’interaction avec la plateforme. Ces données peuvent être fournies directement par vous, générées automatiquement par nos systèmes ou obtenues par le biais de prestataires tiers intégrés à nos services. Voici les principales catégories de données que nous collectons :

                Données d’identification : nom complet, numéro de téléphone, identifiants de connexion, mot de passe (crypté), code de parrainage.
                Données de connexion : adresse IP, type d’appareil, système d’exploitation, navigateur utilisé, dates et heures d’accès, géolocalisation approximative.
                Données financières : montant des dépôts, retraits, lots achetés, gains journaliers, historique des transactions, numéros de compte Mobile Money, preuves de paiement (captures, références).
                Données de navigation : pages consultées, clics, temps passé sur certaines fonctionnalités, logs d’activité.
                Données sociales : informations liées à l’affiliation (filleuls, commissions perçues, niveau hiérarchique dans le réseau).
                Données de support : contenu des messages envoyés au service client, tickets, réponses, avis et commentaires.
                Données administratives : statut du compte, historiques de vérifications effectuées par les agents et administrateurs, rapports de fraude ou d’anomalie.

                2. Finalités du traitement
                Vos données sont collectées pour des raisons précises, strictement liées à la fourniture, l'amélioration et la sécurisation des services offerts par notre plateforme. Les principales finalités sont :

                Permettre l’ouverture, la gestion et la sécurisation de votre compte utilisateur.
                Gérer les investissements effectués, le suivi des lots et le calcul des gains journaliers.
                Authentifier et contrôler l’accès à votre espace personnel.
                Faciliter le traitement des demandes de dépôt et de retrait d’argent.
                Assurer le bon fonctionnement du système de parrainage et de répartition des commissions.
                Détecter, prévenir et enquêter sur toute activité frauduleuse, tentative d’accès non autorisé ou création de multi-comptes.
                Analyser les comportements d’usage afin d’améliorer les performances de l’application et les fonctionnalités proposées.
                Envoyer des communications importantes (notifications système, alertes de sécurité, messages administratifs).
                Répondre aux demandes adressées au support technique ou administratif.
                Respecter les obligations comptables, fiscales et légales imposées par la réglementation nationale.

                3. Base légale du traitement :
                Le traitement de vos données personnelles repose sur plusieurs fondements juridiques :

                L’exécution d’un contrat : pour vous fournir les services proposés sur la plateforme.
                Le consentement explicite : pour certains traitements spécifiques comme l’envoi d’informations commerciales ou la publication de témoignages.
                L’intérêt légitime : pour assurer la sécurité des utilisateurs, prévenir les fraudes ou analyser les performances du service.
                Les obligations légales : en matière de comptabilité, fiscalité, conservation des données ou coopération avec les autorités compétentes.

                4. Conservation des données :
                Vos données personnelles sont conservées de manière sécurisée pendant toute la durée de votre activité sur la plateforme, puis archivées pour une durée supplémentaire de cinq (5) ans à compter de la suppression de votre compte ou de l’inactivité prolongée de celui-ci. Cette conservation répond à nos obligations légales et contractuelles. Passé ce délai, les données sont supprimées ou rendues anonymes de manière irréversible.

                5. Partage et divulgation des données :
                Nous ne vendons ni ne louons vos données personnelles à des tiers. Toutefois, dans le cadre de l’exploitation technique et fonctionnelle de la plateforme, certaines données peuvent être transmises à :

                Des prestataires de paiement pour exécuter vos transactions (Mobile Money, Wave, etc.).
                Des prestataires de services cloud pour l’hébergement de nos serveurs et la sauvegarde de vos informations.
                Des prestataires techniques spécialisés dans l’analyse comportementale ou la sécurisation de nos systèmes.
                Des agents dûment autorisés à valider ou rejeter les opérations sur la base des informations fournies.
                Des autorités judiciaires ou fiscales dans le cadre d’une enquête, d’un contrôle ou sur demande officielle.
                Dans tous les cas, nous veillons à ce que ces partenaires soient soumis à des obligations strictes de confidentialité et de conformité à la réglementation en vigueur.

                6. Reconnaissance des Risques et Absence de Recours Juridique :
                En utilisant notre plateforme et en participant à toute forme d’investissement proposé, vous reconnaissez pleinement que toute opération financière en ligne comporte des risques, 
                y compris, mais sans s’y limiter, la possibilité de perte partielle ou totale du capital investi. Vous déclarez avoir pris connaissance de ces risques et acceptez que les performances passées ne constituent en aucun cas
                une garantie de résultats futurs. Vous comprenez que les décisions d’investissement relèvent exclusivement de votre propre responsabilité et que la plateforme ne peut en aucun cas être tenue pour responsable des pertes, 
                dommages ou préjudices financiers, directs ou indirects, découlant de vos choix ou de l’évolution du marché. En conséquence, vous renoncez expressément, dans les limites permises par la loi, à engager toute action, réclamation ou poursuite judiciaire à l’encontre de la plateforme, 
                de ses administrateurs, employés ou partenaires, en lien avec les pertes éventuelles subies dans le cadre de votre utilisation des services.

                7. Mesures de sécurité :
                Nous avons mis en place des dispositifs de sécurité robustes pour protéger vos données contre la perte, la destruction, l’accès non autorisé, la divulgation ou l’altération. Ces mesures incluent :

                L’utilisation systématique du protocole HTTPS pour toutes les communications.
                Le chiffrement des mots de passe et des données sensibles.
                L’authentification forte et les notifications d’accès inhabituels.
                La journalisation de toutes les opérations effectuées par les administrateurs et agents.
                Des audits réguliers de sécurité, internes et externes.
                Des sauvegardes automatiques chiffrées, stockées dans des datacenters certifiés.
                Un système avancé de détection de multi-comptes, basé sur les empreintes techniques et comportementales.

                8. Droits des utilisateurs :
                Conformément aux lois sur la protection des données personnelles, vous disposez des droits suivants :

                Droit d’accès : vous pouvez consulter les données que nous détenons sur vous.
                Droit de rectification : vous pouvez demander la modification de données inexactes ou incomplètes.
                Droit à l’effacement : vous pouvez demander la suppression de vos données, sous réserve de nos obligations légales.
                Droit à la limitation du traitement : vous pouvez restreindre temporairement l’utilisation de vos données.
                Droit d’opposition : vous pouvez vous opposer au traitement de vos données à des fins de prospection ou pour des raisons liées à votre situation particulière.
                Droit à la portabilité : vous pouvez récupérer vos données dans un format lisible et les transférer à un tiers.
                Pour exercer vos droits, il vous suffit d’adresser un email à privacy.investpro@gmail.com, accompagné d’une copie d’un justificatif d’identité. Nous nous engageons à répondre à votre demande dans un délai de 30 jours maximum.

                9 .Cookies et traceurs :
                Notre plateforme utilise des cookies afin de garantir une navigation fluide, mémoriser vos préférences, sécuriser vos sessions et analyser le comportement des utilisateurs. Les types de cookies que nous utilisons incluent :

                Cookies de session : nécessaires au bon fonctionnement du compte utilisateur.
                Cookies analytiques : pour mesurer l’audience et optimiser l’expérience.
                Cookies fonctionnels : pour mémoriser vos préférences (langue, interface, etc.).
                Vous pouvez désactiver tout ou partie des cookies via les paramètres de votre navigateur, mais cela peut impacter certaines fonctionnalités essentielles de la plateforme.

                10. Transferts internationaux de données :
                Les données collectées sont principalement stockées et traitées au Burkina Faso. Toutefois, dans certains cas, elles peuvent être hébergées ou consultées depuis d’autres pays disposant d’un niveau de protection des données reconnu comme adéquat. En cas de transfert vers un pays tiers non reconnu comme adéquat, des garanties contractuelles supplémentaires seront mises en œuvre (clauses types de la Commission européenne, audit de sécurité, etc.).
                </p>
                <p>
                </p>
              </CardContent>
            </Card>

        
            {/* Conditions de Modification */}
            <Card>
              <CardHeader>
                <CardTitle>Modification de la Politique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Nous nous réservons le droit de modifier cette politique à tout moment. 
                  Les modifications importantes vous seront notifiées via la plateforme. 
                  En continuant à utiliser nos services après modification, vous acceptez les nouvelles conditions.
                </p>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Dernière mise à jour : 3 août 2025</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Version 1.0 - Politique initiale
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bouton de retour */}
            <div className="text-center pt-8">
              <Button onClick={() => navigate('/register')} size="lg">
                J'ai lu et compris la politique
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
