--
-- Structure de la table `agent_applications`
--

CREATE TABLE `agent_applications` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `fullName` varchar(100) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `operator` enum('moov','orange','wave') NOT NULL,
  `agentNumber` varchar(30) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `adminNote` text DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `reviewedAt` datetime DEFAULT NULL,
  `reviewedBy` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `lots`
--

CREATE TABLE `lots` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `dailyReturn` decimal(15,2) NOT NULL,
  `color` varchar(30) DEFAULT NULL,
  `active` tinyint(1) DEFAULT 1,
  `duration` int(11) NOT NULL DEFAULT 40
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('success','error','warning','info') NOT NULL,
  `category` enum('transaction','system','earning','agent','general','commission') DEFAULT 'general',
  `isRead` tinyint(1) DEFAULT 0,
  `relatedId` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `readAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `commissionLevel1` float DEFAULT NULL,
  `commissionLevel2` float DEFAULT NULL,
  `withdrawalFeePercent` float DEFAULT NULL,
  `minWithdrawalAmount` float DEFAULT NULL,
  `maxWithdrawalAmount` float DEFAULT NULL,
  `processingDelayHours` int(11) DEFAULT NULL,
  `autoProcessing` tinyint(1) DEFAULT NULL,
  `maintenanceMode` tinyint(1) DEFAULT NULL,
  `welcomeMessage` text DEFAULT NULL,
  `supportEmail` varchar(255) DEFAULT NULL,
  `supportPhone` varchar(50) DEFAULT NULL,
  `paymentMethods` text DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `type` enum('deposit','withdrawal','earning','commission','purchase','transfer_sent','transfer_received') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `description` text DEFAULT NULL,
  `lotId` int(11) DEFAULT NULL,
  `paymentMethod` varchar(50) DEFAULT NULL,
  `paymentProof` text DEFAULT NULL,
  `agentId` int(11) DEFAULT NULL,
  `agentNumber` varchar(30) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `processedAt` datetime DEFAULT NULL,
  `processedBy` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `fullName` varchar(100) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` enum('user','admin','agent') DEFAULT 'user',
  `totalEarned` decimal(15,2) DEFAULT 0.00,
  `balance` decimal(15,2) DEFAULT 0.00,
  `referralCode` varchar(50) DEFAULT NULL,
  `referredBy` int(11) DEFAULT NULL,
  `accountStatus` enum('active','inactive','blocked') DEFAULT 'active',
  `agentNumber` varchar(30) DEFAULT NULL,
  `operator` enum('moov','orange','wave') DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `password` varchar(255) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--------------------------------------------------------

--
-- Structure de la table `user_lots`
--

CREATE TABLE `user_lots` (
  `id` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `lotId` int(11) NOT NULL,
  `purchasedAt` datetime DEFAULT current_timestamp(),
  `active` tinyint(1) DEFAULT 1,
  `lastEarningDate` datetime DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `agent_applications`
--
ALTER TABLE `agent_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Index pour la table `lots`
--
ALTER TABLE `lots`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_read` (`userId`,`isRead`),
  ADD KEY `idx_created_at` (`createdAt`);

--
-- Index pour la table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `lotId` (`lotId`),
  ADD KEY `agentId` (`agentId`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD KEY `referredBy` (`referredBy`);

--
-- Index pour la table `user_lots`
--
ALTER TABLE `user_lots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `lotId` (`lotId`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `agent_applications`
--
ALTER TABLE `agent_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT pour la table `lots`
--
ALTER TABLE `lots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;

--
-- AUTO_INCREMENT pour la table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=464;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT pour la table `user_lots`
--
ALTER TABLE `user_lots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;
COMMIT;
