<?php
ini_set('display_errors', 0);
error_reporting(0);
// backend/users.php
header('Content-Type: application/json');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        $phone = $_GET['phone'] ?? null;
        $email = $_GET['email'] ?? null;
        $action = $_GET['action'] ?? null;
        $role = $_GET['role'] ?? null;
        
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            echo json_encode($user);
        } elseif ($phone) {
            $stmt = $pdo->prepare('SELECT * FROM users WHERE phone = ?');
            $stmt->execute([$phone]);
            $user = $stmt->fetch();
            echo json_encode($user);
        } elseif ($email) {
            $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            echo json_encode($user);
        } elseif ($action === 'list' && $role) {
            // Filtrer par rôle
            $stmt = $pdo->prepare('SELECT * FROM users WHERE role = ? ORDER BY createdAt DESC');
            $stmt->execute([$role]);
            $users = $stmt->fetchAll();
            echo json_encode($users);
        } elseif ($action === 'list') {
            // Tous les utilisateurs
            $stmt = $pdo->query('SELECT * FROM users ORDER BY createdAt DESC');
            $users = $stmt->fetchAll();
            echo json_encode($users);
        } else {
            $stmt = $pdo->query('SELECT * FROM users ORDER BY createdAt DESC');
            $users = $stmt->fetchAll();
            echo json_encode($users);
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['action']) && $data['action'] === 'login') {
            // Connexion utilisateur
            $stmt = $pdo->prepare('SELECT * FROM users WHERE phone = ?');
            $stmt->execute([$data['phone']]);
            $user = $stmt->fetch();
            if ($user && verifyPassword($data['password'], $user['password'])) {
                unset($user['password']);
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Identifiants invalides']);
            }
        } elseif (isset($data['action']) && $data['action'] === 'changePassword') {
            // Changement de mot de passe
            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$data['id']]);
            $user = $stmt->fetch();
            
            if (!$user) {
                echo json_encode(['success' => false, 'error' => 'Utilisateur non trouvé']);
            } elseif (!verifyPassword($data['currentPassword'], $user['password'])) {
                echo json_encode(['success' => false, 'error' => 'Mot de passe actuel incorrect']);
            } else {
                // Mettre à jour le mot de passe
                $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
                $stmt->execute([hashPassword($data['newPassword']), $data['id']]);
                echo json_encode(['success' => true]);
            }
        } elseif (isset($data['action']) && $data['action'] === 'adminChangePassword') {
            // Changement de mot de passe par admin (sans vérification du mot de passe actuel)
            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$data['id']]);
            $user = $stmt->fetch();
            
            if (!$user) {
                echo json_encode(['success' => false, 'error' => 'Utilisateur non trouvé']);
            } else {
                // Mettre à jour le mot de passe
                $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
                $stmt->execute([hashPassword($data['newPassword']), $data['id']]);
                echo json_encode(['success' => true]);
            }
        } else {
            // Inscription utilisateur
            try {
                $stmt = $pdo->prepare('INSERT INTO users (fullName, phone, email, password, role, balance, totalEarned, referralCode, referredBy, accountStatus, agentNumber, operator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([
                    $data['fullName'],
                    $data['phone'],
                    $data['email'] ?? null,
                    hashPassword($data['password']),
                    $data['role'] ?? 'user',
                    $data['balance'] ?? 0,
                    $data['totalEarned'] ?? 0,
                    $data['referralCode'] ?? null,
                    $data['referredBy'] ?? null,
                    $data['accountStatus'] ?? 'active',
                    $data['agentNumber'] ?? null,
                    $data['operator'] ?? null
                ]);
                $newUserId = $pdo->lastInsertId();
                if (function_exists('sendWelcomeNotification')) {
                    sendWelcomeNotification($newUserId, $data['fullName']);
                }
                echo json_encode(['success' => true, 'id' => $newUserId]);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        }
        break;
    case 'PUT':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Vérifier les données requises
            if (!isset($data['id'])) {
                throw new Exception('ID utilisateur manquant');
            }
            
            // Mise à jour dynamique des champs
            $fields = [];
            $params = [];
            foreach ($data as $key => $value) {
                if ($key !== 'id' && $key !== 'action') {
                    // Ignorer email si vide ou null
                    if ($key === 'email' && (is_null($value) || $value === '')) {
                        continue;
                    }
                    // Validation spéciale pour balance et totalEarned
                    if ($key === 'balance' || $key === 'totalEarned') {
                        $validatedValue = filter_var($value, FILTER_VALIDATE_FLOAT);
                        if ($validatedValue === false) {
                            throw new Exception("$key invalide");
                        }
                        $fields[] = "$key = ?";
                        $params[] = $validatedValue;
                    } else {
                        $fields[] = "$key = ?";
                        $params[] = $value;
                    }
                }
            }
            
            if (!empty($fields)) {
                $params[] = $data['id'];
                $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
                $stmt = $pdo->prepare($sql);
                if (!$stmt->execute($params)) {
                    throw new Exception('Erreur lors de la mise à jour');
                }
            }
            
            // Récupérer l'utilisateur mis à jour
            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$data['id']]);
            $updatedUser = $stmt->fetch();
            
            if (!$updatedUser) {
                throw new Exception('Utilisateur non trouvé après mise à jour');
            }
            
            unset($updatedUser['password']); // Ne pas retourner le mot de passe
            echo json_encode(['success' => true, 'user' => $updatedUser]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Missing id']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
?>
