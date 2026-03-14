-- =============================================
-- Recipes Module — Tables
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'recipes_recipes') AND type = 'U')
BEGIN
  CREATE TABLE recipes_recipes (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(200) NOT NULL,
    category        NVARCHAR(100),
    description     NVARCHAR(MAX),
    yield_qty       DECIMAL(10,3) NOT NULL DEFAULT 1,
    yield_unit      NVARCHAR(20) DEFAULT 'db',
    cost_per_unit   DECIMAL(10,2),
    prep_time_min   INT,
    cook_time_min   INT,
    allergens       NVARCHAR(MAX),
    haccp_notes     NVARCHAR(MAX),
    is_active       BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT GETUTCDATE(),
    updated_at      DATETIME2 DEFAULT GETUTCDATE()
  );
  PRINT '[ACI] recipes_recipes created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'recipes_ingredients') AND type = 'U')
BEGIN
  CREATE TABLE recipes_ingredients (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    recipe_id       INT NOT NULL,
    product_id      INT NULL,
    product_name    NVARCHAR(200) NOT NULL,
    quantity        DECIMAL(10,3) NOT NULL,
    unit            NVARCHAR(20) DEFAULT 'kg',
    unit_cost       DECIMAL(10,2),
    created_at      DATETIME2 DEFAULT GETUTCDATE(),

    CONSTRAINT FK_rec_ing_recipe FOREIGN KEY (recipe_id) REFERENCES recipes_recipes(id) ON DELETE CASCADE
  );
  PRINT '[ACI] recipes_ingredients created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'recipes_production') AND type = 'U')
BEGIN
  CREATE TABLE recipes_production (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    recipe_id       INT NOT NULL,
    batch_qty       DECIMAL(10,3) NOT NULL,
    produced_qty    DECIMAL(10,3) NOT NULL,
    production_date DATE DEFAULT CAST(GETUTCDATE() AS DATE),
    produced_by     INT NULL,
    notes           NVARCHAR(MAX),
    created_at      DATETIME2 DEFAULT GETUTCDATE(),

    CONSTRAINT FK_rec_prod_recipe FOREIGN KEY (recipe_id) REFERENCES recipes_recipes(id)
  );
  PRINT '[ACI] recipes_production created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rec_category')
  CREATE INDEX idx_rec_category ON recipes_recipes(category);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rec_ing_recipe')
  CREATE INDEX idx_rec_ing_recipe ON recipes_ingredients(recipe_id);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rec_prod_recipe')
  CREATE INDEX idx_rec_prod_recipe ON recipes_production(recipe_id);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_rec_prod_date')
  CREATE INDEX idx_rec_prod_date ON recipes_production(production_date);
GO
