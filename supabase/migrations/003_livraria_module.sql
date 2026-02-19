-- =====================================================
-- MÓDULO DE LIVRARIA / PDV
-- =====================================================
-- Data: 2026-02-19
-- Sistema completo de gestão de produtos e vendas

-- =====================================================
-- 1. PRODUCT CATEGORIES (Categorias de Produtos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

-- Seed de categorias
INSERT INTO public.product_categories (slug, name, sort_order) VALUES
    ('livros', 'Livros', 1),
    ('biblia', 'Bíblias', 2),
    ('dvds', 'DVDs', 3),
    ('camisetas', 'Camisetas', 4),
    ('canecas', 'Canecas', 5),
    ('adesivos', 'Adesivos', 6),
    ('diversos', 'Diversos', 99)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 2. PRODUCTS (Produtos)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Informações básicas
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE,
    barcode TEXT,
    
    -- Categoria
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    
    -- Preços
    cost_price DECIMAL(10,2) DEFAULT 0,
    sale_price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    
    -- Estoque
    stock_quantity INT DEFAULT 0,
    min_stock_quantity INT DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Imagens
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- =====================================================
-- 3. STOCK MOVEMENTS (Movimentações de Estoque)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    
    -- Tipo de movimentação
    movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste', 'venda', 'devolucao')),
    
    -- Quantidade
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    current_stock INT NOT NULL,
    
    -- Valores
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    
    -- Referências
    sale_id UUID,
    
    -- Observações
    reason TEXT,
    notes TEXT,
    
    -- Responsável
    registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sale_id ON public.stock_movements(sale_id);

-- =====================================================
-- 4. SALES (Vendas)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Número da venda
    sale_number TEXT UNIQUE NOT NULL,
    
    -- Cliente
    customer_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Valores
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    
    -- Pagamento
    payment_method TEXT CHECK (payment_method IN ('dinheiro', 'pix', 'debito', 'credito', 'mercadopago', 'outro')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'refunded')),
    paid_at TIMESTAMPTZ,
    
    -- MercadoPago
    mercadopago_payment_id TEXT,
    mercadopago_preference_id TEXT,
    mercadopago_external_reference TEXT,
    
    -- Observações
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Cancelamento
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Responsável
    registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON public.sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_person_id ON public.sales(customer_person_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_mercadopago_payment_id ON public.sales(mercadopago_payment_id);

-- =====================================================
-- 5. SALE ITEMS (Itens da Venda)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    
    -- Produto (snapshot no momento da venda)
    product_name TEXT NOT NULL,
    product_sku TEXT,
    
    -- Quantidade e valores
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_discount DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- =====================================================
-- 6. MERCADOPAGO WEBHOOKS (Logs de Webhooks)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mercadopago_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Dados do webhook
    action TEXT,
    api_version TEXT,
    data_id TEXT,
    date_created TIMESTAMPTZ,
    webhook_id TEXT,
    live_mode BOOLEAN,
    type TEXT,
    user_id TEXT,
    
    -- Payload completo
    raw_payload JSONB NOT NULL,
    
    -- Processamento
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Relacionamento com venda
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mercadopago_webhooks_data_id ON public.mercadopago_webhooks(data_id);
CREATE INDEX IF NOT EXISTS idx_mercadopago_webhooks_created_at ON public.mercadopago_webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mercadopago_webhooks_processed ON public.mercadopago_webhooks(processed);

-- =====================================================
-- 7. FUNCTION: Gerar número de venda
-- =====================================================

CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INT;
BEGIN
    -- Formato: VENDA-YYYYMMDD-NNNN
    SELECT COUNT(*) + 1 INTO counter 
    FROM public.sales 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_number := 'VENDA-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGER: Auto-gerar número da venda
-- =====================================================

CREATE OR REPLACE FUNCTION set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sale_number IS NULL THEN
        NEW.sale_number := generate_sale_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_sale_number
    BEFORE INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION set_sale_number();

-- =====================================================
-- 9. TRIGGER: Atualizar estoque ao inserir item
-- =====================================================

CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    current_stock_val INT;
    sale_status TEXT;
BEGIN
    -- Buscar status da venda
    SELECT status INTO sale_status FROM public.sales WHERE id = NEW.sale_id;
    
    -- Só atualiza estoque se venda estiver paga ou pendente
    IF sale_status IN ('paid', 'pending') THEN
        -- Buscar estoque atual
        SELECT stock_quantity INTO current_stock_val 
        FROM public.products 
        WHERE id = NEW.product_id;
        
        -- Atualizar estoque
        UPDATE public.products 
        SET stock_quantity = stock_quantity - NEW.quantity 
        WHERE id = NEW.product_id;
        
        -- Registrar movimentação
        INSERT INTO public.stock_movements (
            product_id, 
            movement_type, 
            quantity, 
            previous_stock, 
            current_stock, 
            unit_cost, 
            total_cost,
            sale_id,
            reason
        ) VALUES (
            NEW.product_id,
            'venda',
            -NEW.quantity,
            current_stock_val,
            current_stock_val - NEW.quantity,
            NEW.unit_price,
            NEW.total,
            NEW.sale_id,
            'Venda ' || (SELECT sale_number FROM public.sales WHERE id = NEW.sale_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_sale
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_sale();

-- =====================================================
-- 10. RLS PARA LIVRARIA
-- =====================================================

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active products" ON public.products 
    FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can manage products" ON public.products 
    FOR ALL USING (auth.role() = 'authenticated');

-- Sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sales" ON public.sales 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can create sales" ON public.sales 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update sales" ON public.sales 
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Stock Movements (somente leitura para auditoria)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view stock movements" ON public.stock_movements 
    FOR SELECT USING (auth.role() = 'authenticated');
