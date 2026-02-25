MENU-BASED PERSONALIZED DISH RECOMMENDER

Idea and Technical Specification Document

Author: Ceren Oguz

Date: February 18, 2026

Location: Amherst, Massachusetts, USA

Abstract:
This document describes a mobile and/or web application that recommends restaurant menu items to users based on their individual ingredient-level taste preferences. The system analyzes the ingredients associated with menu items and compares them against a structured user taste profile to identify dishes the user is most likely to enjoy.
The goal is to reduce uncertainty when ordering from unfamiliar menus and increase user confidence in selecting dishes aligned with their personal preferences.

Problem Statement:
When users visit new restaurants, especially those serving unfamiliar cuisines, menus often lack images or clear ingredient descriptions. Dish names alone may not provide enough information for users to determine whether they will enjoy the dish.
This leads to:

• uncertainty and hesitation when ordering
• increased risk of selecting dishes they dislike
• reduced dining satisfaction
• avoidance of new or unfamiliar cuisines

There is currently no widely adopted system that provides personalized, ingredient-level recommendations directly from a restaurant menu.

Proposed Solution:
The proposed application allows users to create a personalized taste profile by selecting ingredients they:

• like
• dislike
• strongly dislike or cannot consume (allergens, dietary restrictions)

When the user encounters a restaurant menu, they can:

• scan the menu using their phone camera, or
• paste menu text into the application

The system then:

• Extracts dish names and descriptions
• Infers ingredient composition for each dish
• Compares each dish’s ingredient profile against the user's taste profile
• Computes a similarity score
• Returns a ranked list of recommended dishes
• The application highlights the “safest” and most compatible dish for the user.

Core Features:

4.1 User Taste Profile Creation:
Users select ingredients from a structured ingredient list.

Example:

Liked:
garlic, chicken, butter, tomato

Disliked:
cilantro, olives

Avoid completely:
peanuts, shellfish

This profile is stored persistently.

4.2 Menu Input:
Supported input methods:

• Camera scan (image → text extraction)
• Text paste
• Manual selection

4.3 Dish Analysis Engine:
Each dish is represented as an ingredient vector.

Example:
Dish: Chicken Alfredo

Ingredients:
chicken, butter, cream, garlic, parmesan

4.4 Recommendation Engine:
The system computes similarity between:

User ingredient vector
Dish ingredient vector

Using a weighted scoring function.

The output includes:

• top recommended dish
• ranked alternatives
• explanation of recommendation

Example output:

Recommended: Chicken Alfredo
Reason:
Matches liked ingredients: chicken, butter, garlic
Avoids disliked ingredients: cilantro

4.5 Feedback System:
Users can mark:

• liked dish
• disliked dish
This feedback improves future recommendations.

Technical Architecture Overview:
Frontend:
Mobile application (React Native or equivalent)
Backend:
API server handling:
• user profiles
• menu parsing
• recommendation scoring
Database:
Relational database storing:
users
ingredient preferences
dish profiles
recommendation history
Storage:
Optional storage for menu scan images

Differentiation and Innovation:
This system differs from traditional recommender systems because it operates on ingredient-level personalization rather than relying on crowd ratings or collaborative filtering.
Key innovations:
• ingredient-based personalization
• real-time menu analysis
• personalized recommendations without prior restaurant data
• applicability to any restaurant globally

Example User Flow:

Step 1: User creates account
Step 2: User selects ingredient preferences
Step 3: User visits restaurant
Step 4: User scans or pastes menu
Step 5: Application recommends best dish
Step 6: User orders with increased confidence

Development Roadmap:

Phase 1:
Basic system with manual menu input and ingredient matching
Phase 2:
Menu scanning and automated ingredient inference
Phase 3:
Improved recommendation model and feedback integration
Phase 4:
Scalability improvements and expanded ingredient database

Intended Use and Scope:
This application is intended as a consumer mobile or web application that assists users in making informed dining decisions based on personal taste preferences.

Authorship and Ownership Declaration:
This concept, system design, and implementation plan were created and documented by:
Ceren Oguz
Original creation date: February 18, 2026
This document serves as a formal record of authorship and concept definition.





