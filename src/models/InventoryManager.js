export class InventoryManager {
  constructor() {
    // Mock Data Initialization
    this.engines = [
      { id: 'e1', name: 'Cummins ISX' },
      { id: 'e2', name: 'Detroit DD15' },
      { id: 'e3', name: 'CAT C15' }
    ];

    this.categories = [
      { id: 'c1', name: 'Gaskets' },
      { id: 'c2', name: 'Pistons' },
      { id: 'c3', name: 'Injectors' }
    ];

    // Master Product Definitions
    // One definition per "Product" type, regardless of brand
    this.products = [
      {
        id: 'p1',
        engineId: 'e1',
        categoryId: 'c1',
        name: 'Head Gasket Set',
        partNumber: '4089758', // Standard Industry Number or Reference
        description: 'Complete head gasket set for ISX15 CM871',
        notes: 'Check liner protrusion before installation. Key lookup: Upper gasket is multilayer steel.',
        altNumbers: ['4920211', '4299098']
      },
      {
        id: 'p2',
        engineId: 'e1',
        categoryId: 'c2',
        name: 'Piston Kit',
        partNumber: '4309123',
        description: 'Monotherm Piston Kit',
        notes: 'Includes rings and pin.',
        altNumbers: []
      }
    ];

    // Brand Variants (The actual sellable items)
    // They link to a product definition
    this.brandVariants = [
      {
        id: 'b1',
        productId: 'p1',
        brand: 'McBee',
        price: 185.00,
        sku: 'MCB-4089758'
      },
      {
        id: 'b2',
        productId: 'p1',
        brand: 'PAI',
        price: 195.50,
        sku: 'PAI-4089758'
      },
      {
        id: 'b3',
        productId: 'p1',
        brand: 'OEM',
        price: 450.00,
        sku: 'CUM-4089758'
      }
    ];
  }

  getEngines() {
    return this.engines;
  }

  getCategories() {
    return this.categories;
  }

  // Get products filtered by Engine and Category
  // Returns joined data: Product + Array of Variants? 
  // Or just Products, and we fetch variants later?
  // User wants: Engine.Category.Product -> List
  getProducts(engineId, categoryId) {
    return this.products.filter(p => p.engineId === engineId && p.categoryId === categoryId);
  }

  getProductById(productId) {
    return this.products.find(p => p.id === productId);
  }

  // Get all variants (Brands) for a specific product
  getVariantsForProduct(productId) {
    return this.brandVariants.filter(v => v.productId === productId);
  }

  // THE KEY LOGIC: Edit Product Definition (P1)
  // This updates the Description/Notes for "P1"
  // Since all brands (b1, b2, b3) link to p1, they all effectively "see" the change immediately.
  updateProductDefinition(productId, updates) {
    const index = this.products.findIndex(p => p.id === productId);
    if (index !== -1) {
      this.products[index] = { ...this.products[index], ...updates };
      return this.products[index];
    }
    return null;
  }

  // Edit a specific Brand Variant (e.g. Price)
  updateVariant(variantId, updates) {
    const index = this.brandVariants.findIndex(v => v.id === variantId);
    if (index !== -1) {
      this.brandVariants[index] = { ...this.brandVariants[index], ...updates };
      return this.brandVariants[index];
    }
    return null;
  }
}

export const inventoryManager = new InventoryManager();
