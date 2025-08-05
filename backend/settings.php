<?php
// Affichage des erreurs pour le débogage
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Connexion à la base de données via db.php
require_once 'db.php'; // Ce fichier doit définir $pdo

// Nettoyage du tampon de sortie
ob_clean();
header('Content-Type: application/json');

// Méthode GET : récupérer les paramètres
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM settings WHERE id = 1 LIMIT 1");
        $stmt->execute();
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($settings) {
            // Convertir la chaîne paymentMethods en tableau
            $settings['paymentMethods'] = explode(',', $settings['paymentMethods']);
            echo json_encode($settings);
        } else {
            echo json_encode(null);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Méthode POST : mettre à jour les paramètres
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Lire le corps de la requête
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    // Vérifier si le JSON est valide
    if (json_last_error() !== JSON_ERROR_NONE || !$data) {
        echo json_encode([
            'success' => false,
            'error' => 'JSON invalide',
            'json_error' => json_last_error_msg(),
            'input' => $rawInput
        ]);
        exit;
    }

    // Convertir paymentMethods (array) en string
    $paymentMethods = isset($data['paymentMethods']) ? implode(',', $data['paymentMethods']) : '';

    // Requête SQL de mise à jour
    $sql = "UPDATE settings SET
        commissionLevel1 = :commissionLevel1,
        commissionLevel2 = :commissionLevel2,
        withdrawalFeePercent = :withdrawalFeePercent,
        minWithdrawalAmount = :minWithdrawalAmount,
        maxWithdrawalAmount = :maxWithdrawalAmount,
        processingDelayHours = :processingDelayHours,
        autoProcessing = :autoProcessing,
        maintenanceMode = :maintenanceMode,
        welcomeMessage = :welcomeMessage,
        supportEmail = :supportEmail,
        supportPhone = :supportPhone,
        paymentMethods = :paymentMethods
        WHERE id = 1";

    try {
        $stmt = $pdo->prepare($sql);
        $success = $stmt->execute([
            ':commissionLevel1' => $data['commissionLevel1'],
            ':commissionLevel2' => $data['commissionLevel2'],
            ':withdrawalFeePercent' => $data['withdrawalFeePercent'],
            ':minWithdrawalAmount' => $data['minWithdrawalAmount'],
            ':maxWithdrawalAmount' => $data['maxWithdrawalAmount'],
            ':processingDelayHours' => $data['processingDelayHours'],
            ':autoProcessing' => $data['autoProcessing'] ? 1 : 0,
            ':maintenanceMode' => $data['maintenanceMode'] ? 1 : 0,
            ':welcomeMessage' => $data['welcomeMessage'],
            ':supportEmail' => $data['supportEmail'],
            ':supportPhone' => $data['supportPhone'],
            ':paymentMethods' => $paymentMethods
        ]);
        echo json_encode(['success' => $success]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}
?>
