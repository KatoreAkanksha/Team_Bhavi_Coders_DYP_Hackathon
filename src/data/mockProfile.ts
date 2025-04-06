export const mockUserProfile = {
  id: "1",
  name: "Prathmesh Bavge",
  email: "prathmeshbavge@gmail.com",
  userType: "professional" as const,
  avatar: "/avatars/default.png",
  creditScore: 750,
  preferences: {
    language: "en",
    currency: "INR",
    theme: "light"
  },
  created_at: new Date("2024-01-01")
};

// Also export as default for compatibility
export default { mockUserProfile };

// Test credentials - show these to users
export const TEST_CREDENTIALS = {
  email: "prathmeshbavge@gmail.com",
  password: "any-password" // any password will work in mock mode
};
