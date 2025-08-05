
-- backend/init.sql
-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    role ENUM('user','admin','agent') DEFAULT 'user',
    balance DECIMAL(15,2) DEFAULT 0,
    totalEarned DECIMAL(15,2) DEFAULT 0,
    referralCode VARCHAR(50),
    referredBy INT,
    accountStatus ENUM('active','inactive','blocked') DEFAULT 'active',
    agentNumber VARCHAR(30),
    operator ENUM('moov', 'orange', 'wave') DEFAULT NULL COMMENT 'Opérateur de paiement pour les agents',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (referredBy) REFERENCES users(id)
);

-- Table des demandes pour devenir agent
CREATE TABLE IF NOT EXISTS agent_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    operator ENUM('moov', 'orange', 'wave') NOT NULL,
    agentNumber VARCHAR(30) NOT NULL,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    adminNote TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewedAt DATETIME DEFAULT NULL,
    reviewedBy INT DEFAULT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- Table des lots d'investissement
CREATE TABLE IF NOT EXISTS lots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    dailyReturn DECIMAL(15,2) NOT NULL,
    duration INT NOT NULL,
    color VARCHAR(30),
    active BOOLEAN DEFAULT TRUE
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    type ENUM('deposit','withdrawal','earning','commission','purchase','transfer_sent','transfer_received') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
    description TEXT,
    lotId INT,
    paymentMethod VARCHAR(50),
    paymentProof TEXT,
    agentId INT,
    agentNumber VARCHAR(30),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    processedAt DATETIME,
    processedBy VARCHAR(100),
    reason TEXT,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (lotId) REFERENCES lots(id),
    FOREIGN KEY (agentId) REFERENCES users(id)
);

-- Table des lots achetés par utilisateur
CREATE TABLE IF NOT EXISTS user_lots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    lotId INT NOT NULL,
    purchasedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    lastEarningDate DATETIME,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (lotId) REFERENCES lots(id)
);


-- Table des paramètres du système
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    commissionLevel1 FLOAT,
    commissionLevel2 FLOAT,
    withdrawalFeePercent FLOAT,
    minWithdrawalAmount FLOAT,
    maxWithdrawalAmount FLOAT,
    processingDelayHours INT,
    autoProcessing TINYINT(1),
    maintenanceMode TINYINT(1),
    welcomeMessage TEXT,
    supportEmail VARCHAR(255),
    supportPhone VARCHAR(50),
    paymentMethods TEXT
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('success','error','warning','info') NOT NULL,
    category ENUM('transaction','system','earning','agent','general','commission') DEFAULT 'general',
    isRead TINYINT(1) DEFAULT 0,
    relatedId INT DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    readAt DATETIME DEFAULT NULL,
    INDEX idx_user_read (userId, isRead),
    INDEX idx_created_at (createdAt),
    INDEX idx_user_id (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
