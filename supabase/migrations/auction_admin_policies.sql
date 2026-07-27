-- ╔══════════════════════════════════════════════════════════╗
-- ║  OLYMPUS — Auction RLS Policies for Admin/Auctioneer     ║
-- ║  Run AFTER create_auction_tables.sql                     ║
-- ╚══════════════════════════════════════════════════════════╝

-- Helper function: check if the current user is an admin or auctioneer
CREATE OR REPLACE FUNCTION public.is_auction_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'auctioneer')
  );
$$;

-- ── auction_config: admins can update ──
CREATE POLICY "Admins can update auction config"
  ON public.auction_config FOR UPDATE
  TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

-- ── auction_players: admins can insert, update ──
CREATE POLICY "Admins can insert auction players"
  ON public.auction_players FOR INSERT
  TO authenticated
  WITH CHECK (public.is_auction_admin());

CREATE POLICY "Admins can update auction players"
  ON public.auction_players FOR UPDATE
  TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

-- ── auction_bids: admins can insert ──
CREATE POLICY "Admins can insert auction bids"
  ON public.auction_bids FOR INSERT
  TO authenticated
  WITH CHECK (public.is_auction_admin());

-- ── franchises: admins can update budget columns ──
CREATE POLICY "Admins can update franchises"
  ON public.franchises FOR UPDATE
  TO authenticated
  USING (public.is_auction_admin())
  WITH CHECK (public.is_auction_admin());

-- ── player_registrations: admins can view all (for auction player list) ──
CREATE POLICY "Admins can view all registrations"
  ON public.player_registrations FOR SELECT
  TO authenticated
  USING (public.is_auction_admin());

-- Grant necessary permissions to authenticated role for admin operations
GRANT INSERT, UPDATE ON public.auction_config TO authenticated;
GRANT INSERT, UPDATE ON public.auction_players TO authenticated;
GRANT INSERT ON public.auction_bids TO authenticated;
GRANT UPDATE ON public.franchises TO authenticated;
