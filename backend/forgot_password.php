<?php
// backend/forgot_password.php
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = isset($data['email']) ? trim($data['email']) : '';

if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Email requis']);
    exit;
}

// Vérifier si l'utilisateur existe
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Utilisateur non trouvé']);
    exit;
}

// Générer un token de réinitialisation
$token = bin2hex(random_bytes(32));
$expiry = date('Y-m-d H:i:s', time() + 3600); // 1h

// Stocker le token et l'expiration
$stmt = $pdo->prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?');
$stmt->execute([$token, $expiry, $user['id']]);

// Envoyer l'email (à adapter avec votre système d'email)
// $resetLink = 'http://localhost:8080/reset-password?token=' . $token;
// mail($email, 'Réinitialisation du mot de passe', "Cliquez ici pour réinitialiser: $resetLink");

// Pour test, on retourne le lien (à retirer en prod)
echo json_encode(['message' => 'Lien de réinitialisation généré', 'reset_link' => 'http://localhost:8080/reset-password?token=' . $token]);
