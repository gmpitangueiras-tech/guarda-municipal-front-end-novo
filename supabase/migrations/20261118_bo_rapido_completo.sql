-- BO Rápido/Completo nativo: mantém RPC pública, RLS e bucket privado.
-- Não altera registros históricos nem a configuração de tamanho/privacidade do bucket.

BEGIN;

-- Assinaturas são separadas do JSON amplamente legível da ocorrência.
CREATE TABLE IF NOT EXISTS public.ocorrencia_assinaturas_privadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  envolvido_id uuid NOT NULL REFERENCES public.envolvidos(id) ON DELETE CASCADE,
  assinatura_data_url text NOT NULL,
  assinado_em timestamp with time zone NOT NULL DEFAULT now(),
  assinado_por uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  nome_guarda text NOT NULL,
  metodo text NOT NULL DEFAULT 'captura_manuscrita_em_tela',
  CONSTRAINT ocorrencia_assinaturas_privadas_env_un UNIQUE (ocorrencia_id, envolvido_id),
  CONSTRAINT ocorrencia_assinaturas_privadas_data_ck CHECK (
    length(assinatura_data_url) <= 262144
    AND assinatura_data_url ~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$'
  )
);

ALTER TABLE public.ocorrencia_assinaturas_privadas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ocorrencia_assinaturas_privadas FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE public.ocorrencia_assinaturas_privadas TO authenticated;

DROP POLICY IF EXISTS ocorrencia_assinaturas_privadas_autor_insert ON public.ocorrencia_assinaturas_privadas;
CREATE POLICY ocorrencia_assinaturas_privadas_autor_insert
ON public.ocorrencia_assinaturas_privadas
FOR INSERT
TO authenticated
WITH CHECK (
  public.gm_is_active_profile()
  AND ocorrencia_assinaturas_privadas.assinado_por = public.gm_current_profile_id()
  AND EXISTS (
    SELECT 1
    FROM public.ocorrencias AS o
    JOIN public.envolvidos AS e ON e.ocorrencia_id = o.id
    WHERE o.id = ocorrencia_assinaturas_privadas.ocorrencia_id
      AND e.id = ocorrencia_assinaturas_privadas.envolvido_id
      AND o.criado_por = public.gm_current_profile_id()
      AND o.origem_criacao = 'app'
      AND o.status = 'pending_sync'
      AND o.esta_ativa IS TRUE
      AND o.deleted_at IS NULL
      AND e.criado_por = public.gm_current_profile_id()
  )
);

CREATE OR REPLACE FUNCTION public.gm_can_attach_initial_occurrence(p_occurrence_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT public.gm_is_active_profile()
    AND EXISTS (
      SELECT 1
      FROM public.ocorrencias AS o
      WHERE o.id = p_occurrence_id
        AND o.ocorrencia_original_id IS NULL
        AND o.origem_criacao = 'app'
        AND o.status = 'synced'
        AND o.esta_ativa IS TRUE
        AND o.deleted_at IS NULL
        AND o.criado_por = public.gm_current_profile_id()
        AND o.criado_em >= (now() - interval '1 hour')::timestamp without time zone
    );
$function$;

REVOKE ALL ON FUNCTION public.gm_can_attach_initial_occurrence(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gm_can_attach_initial_occurrence(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.gm_initial_anexo_allowed(p_occurrence_id uuid, p_mimetype text, p_size text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT public.gm_can_attach_initial_occurrence(p_occurrence_id)
    AND CASE
      WHEN coalesce(p_size, '') ~ '^[0-9]{1,10}$' THEN p_size::bigint BETWEEN 1 AND 1048576
      ELSE false
    END
    AND EXISTS (
      SELECT 1
      FROM public.ocorrencias AS o
      WHERE o.id = p_occurrence_id
        AND (
          (
            o.modo_criacao = 'rapido'
            AND lower(coalesce(p_mimetype, '')) IN (
              'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
              'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff'
            )
          )
          OR
          (
            o.modo_criacao = 'completo'
            AND lower(coalesce(p_mimetype, '')) IN (
              'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
              'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff',
              'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
              'video/x-m4v', 'video/3gpp', 'video/3gpp2', 'video/ogg', 'video/x-matroska',
              'application/pdf'
            )
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.gm_initial_anexo_allowed(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gm_initial_anexo_allowed(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gm_private_anexo_path_exists(p_occurrence_id uuid, p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT public.gm_is_active_profile()
    AND p_path IS NOT NULL
    AND split_part(p_path, '/', 1) = public.gm_current_profile_id()::text
    AND split_part(p_path, '/', 2) = p_occurrence_id::text
    AND split_part(p_path, '/', 3) NOT IN ('', '.', '..')
    AND split_part(p_path, '/', 4) = ''
    AND EXISTS (
      SELECT 1
      FROM storage.objects AS so
      WHERE so.bucket_id = 'anexos'
        AND so.name = p_path
        AND public.gm_initial_anexo_allowed(p_occurrence_id, so.metadata->>'mimetype', so.metadata->>'size')
    );
$function$;

REVOKE ALL ON FUNCTION public.gm_private_anexo_path_exists(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gm_private_anexo_path_exists(uuid, text) TO authenticated;

DROP POLICY IF EXISTS anexos_managed_insert ON public.anexos;
CREATE POLICY anexos_managed_insert
ON public.anexos
FOR INSERT
TO authenticated
WITH CHECK (
  (
    public.gm_can_edit_occurrence_payload(ocorrencia_id)
    OR (
      public.gm_can_attach_initial_occurrence(ocorrencia_id)
      AND url_thumb IS NULL
      AND public.gm_private_anexo_path_exists(ocorrencia_id, url)
      AND mime_type IS NOT NULL
      AND (
        (tipo_arquivo = 'image' AND lower(mime_type) LIKE 'image/%')
        OR (tipo_arquivo = 'video' AND lower(mime_type) LIKE 'video/%')
        OR (tipo_arquivo = 'document' AND lower(mime_type) = 'application/pdf')
      )
      AND EXISTS (
        SELECT 1 FROM storage.objects AS so
        WHERE so.bucket_id = 'anexos' AND so.name = url
          AND lower(so.metadata->>'mimetype') = lower(mime_type)
      )
    )
  )
  AND COALESCE(criado_por, public.gm_current_profile_id()) = public.gm_current_profile_id()
);

DROP POLICY IF EXISTS anexos_managed_delete ON public.anexos;
CREATE POLICY anexos_managed_delete
ON public.anexos
FOR DELETE
TO authenticated
USING (
  public.gm_can_edit_occurrence_payload(ocorrencia_id)
  OR (
    public.gm_can_attach_initial_occurrence(ocorrencia_id)
    AND criado_por = public.gm_current_profile_id()
    AND public.gm_private_anexo_path_exists(ocorrencia_id, url)
  )
);

DROP POLICY IF EXISTS anexos_owner_insert ON storage.objects;
CREATE POLICY anexos_owner_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'anexos'
  AND public.gm_is_active_profile()
  AND split_part(name, '/', 1) = public.gm_current_profile_id()::text
  AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND split_part(name, '/', 3) NOT IN ('', '.', '..')
  AND split_part(name, '/', 4) = ''
  AND (
    public.gm_can_edit_occurrence_payload(split_part(name, '/', 2)::uuid)
    OR public.gm_initial_anexo_allowed(
      split_part(name, '/', 2)::uuid,
      metadata->>'mimetype',
      metadata->>'size'
    )
  )
);

DROP POLICY IF EXISTS anexos_owner_delete ON storage.objects;
CREATE POLICY anexos_owner_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'anexos'
  AND public.gm_is_active_profile()
  AND split_part(name, '/', 1) = public.gm_current_profile_id()::text
  AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND split_part(name, '/', 3) NOT IN ('', '.', '..')
  AND split_part(name, '/', 4) = ''
  AND (
    public.gm_can_edit_occurrence_payload(split_part(name, '/', 2)::uuid)
    OR public.gm_can_attach_initial_occurrence(split_part(name, '/', 2)::uuid)
  )
);

CREATE OR REPLACE FUNCTION public.gm_registrar_ocorrencia(p_dados jsonb, p_equipe jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_eu uuid := public.gm_current_profile_id();
  v_perfil text := public.gm_current_role();
  v_id uuid;
  v_resp uuid;
  v_apoio uuid;
  v_gravidade text := lower(btrim(coalesce(p_dados->>'gravidade', '')));
  v_inicio timestamp without time zone := coalesce(nullif(p_dados->>'data_hora_inicio', '')::timestamp, now()::timestamp);
  v_enc timestamp without time zone := nullif(p_dados->>'data_hora_encerramento', '')::timestamp;
  v_modo text := lower(btrim(coalesce(p_dados->>'modo_criacao', 'completo')));
  v_bo text := nullif(btrim(coalesce(p_dados->>'numero_bo', '')), '');
  v_envolvidos jsonb := coalesce(p_dados->'envolvidos', '[]'::jsonb);
  v_assinaturas_input jsonb := coalesce(p_dados->'assinaturas', '[]'::jsonb);
  v_assinaturas jsonb := '[]'::jsonb;
  v_envolvido jsonb;
  v_assinatura jsonb;
  v_env_id uuid;
  v_ass_env_id uuid;
  v_env_ids uuid[] := ARRAY[]::uuid[];
  v_ass_env_ids uuid[] := ARRAY[]::uuid[];
  v_tipo text;
  v_nome text;
  v_cpf text;
  v_telefone text;
  v_observacoes text;
  v_data_assinatura text;
  v_total_bytes_assinaturas integer := 0;
  v_nome_guarda text;
  v_completado_em timestamp with time zone;
  v_data_finalizacao timestamp without time zone;
BEGIN
  IF p_dados IS NULL OR jsonb_typeof(p_dados) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Dados do registro inválidos.';
  END IF;

  IF v_eu IS NULL THEN
    RAISE EXCEPTION 'Sessão não identificada. Faça login novamente para registrar a ocorrência.';
  END IF;

  IF v_gravidade NOT IN ('baixa', 'media', 'alta', 'critica') THEN
    RAISE EXCEPTION 'Gravidade inválida. Escolha Baixa, Média, Alta ou Crítica.';
  END IF;

  IF nullif(btrim(coalesce(p_dados->>'tipo_ocorrencia', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o tipo da ocorrência.';
  END IF;

  IF nullif(btrim(coalesce(p_dados->>'forma_solicitacao', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe como o acionamento chegou até a Guarda.';
  END IF;

  IF nullif(btrim(coalesce(p_dados->>'local_ocorrencia', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o local da ocorrência.';
  END IF;

  IF v_modo NOT IN ('completo', 'rapido') THEN
    RAISE EXCEPTION 'Modo de registro inválido.';
  END IF;

  IF v_enc IS NOT NULL AND v_enc < v_inicio THEN
    RAISE EXCEPTION 'O horário de encerramento não pode ser anterior ao início do atendimento.';
  END IF;

  IF v_modo = 'completo' AND v_enc IS NULL THEN
    RAISE EXCEPTION 'Informe o horário em que o atendimento terminou.';
  END IF;

  IF v_modo = 'completo' AND length(btrim(coalesce(p_dados->>'observacoes', ''))) < 10 THEN
    RAISE EXCEPTION 'Descreva o ocorrido com pelo menos 10 caracteres.';
  END IF;

  IF nullif(btrim(coalesce(p_dados->>'observacoes', '')), '') IS NULL THEN
    RAISE EXCEPTION 'Informe o relato da ocorrência.';
  END IF;

  IF jsonb_typeof(v_envolvidos) IS DISTINCT FROM 'array'
     OR jsonb_typeof(v_assinaturas_input) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Lista de envolvidos ou assinaturas inválida.';
  END IF;
  IF jsonb_array_length(v_envolvidos) > 100 OR jsonb_array_length(v_assinaturas_input) > 100 THEN
    RAISE EXCEPTION 'O limite de itens de envolvidos ou assinaturas foi excedido.';
  END IF;
  IF v_modo = 'rapido' AND (jsonb_array_length(v_envolvidos) > 0 OR jsonb_array_length(v_assinaturas_input) > 0) THEN
    RAISE EXCEPTION 'Envolvidos e assinaturas fazem parte do BO Completo.';
  END IF;

  -- Validar todos os envolvidos antes de criar o registro-pai.
  FOR v_envolvido IN SELECT value FROM jsonb_array_elements(v_envolvidos) AS item(value) LOOP
    IF jsonb_typeof(v_envolvido) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Os dados de um envolvido são inválidos.';
    END IF;
    BEGIN
      v_env_id := nullif(v_envolvido->>'id', '')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Identificação de envolvido inválida.';
    END;
    IF v_env_id IS NULL OR v_env_id = ANY(v_env_ids) THEN
      RAISE EXCEPTION 'Cada envolvido precisa de uma identificação única.';
    END IF;

    v_tipo := lower(btrim(coalesce(v_envolvido->>'tipo', '')));
    v_nome := btrim(regexp_replace(coalesce(v_envolvido->>'nome_completo', ''), '[[:space:]]+', ' ', 'g'));
    v_cpf := nullif(btrim(coalesce(v_envolvido->>'cpf', '')), '');
    v_telefone := nullif(btrim(coalesce(v_envolvido->>'telefone', '')), '');
    v_observacoes := nullif(btrim(coalesce(v_envolvido->>'observacoes', '')), '');

    IF v_tipo NOT IN ('autor', 'vitima', 'testemunha', 'solicitante', 'outro') THEN
      RAISE EXCEPTION 'Selecione um tipo válido para cada envolvido.';
    END IF;
    IF v_nome = '' OR length(v_nome) > 255 THEN
      RAISE EXCEPTION 'Informe o nome completo do envolvido (até 255 caracteres).';
    END IF;
    IF v_cpf IS NOT NULL AND length(v_cpf) > 14 THEN
      RAISE EXCEPTION 'O CPF do envolvido excede o tamanho permitido.';
    END IF;
    IF v_telefone IS NOT NULL AND length(v_telefone) > 20 THEN
      RAISE EXCEPTION 'O telefone do envolvido excede o tamanho permitido.';
    END IF;
    v_env_ids := array_append(v_env_ids, v_env_id);
  END LOOP;

  -- Cada assinatura deve ser uma imagem PNG e estar vinculada a um envolvido deste BO.
  SELECT coalesce(nullif(btrim(u.nome_completo), ''), nullif(btrim(u.apelido), ''), 'GM')
    INTO v_nome_guarda
  FROM public.usuarios AS u
  WHERE u.id = v_eu
  LIMIT 1;
  v_nome_guarda := coalesce(v_nome_guarda, 'GM');

  FOR v_assinatura IN SELECT value FROM jsonb_array_elements(v_assinaturas_input) AS item(value) LOOP
    IF jsonb_typeof(v_assinatura) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Os dados de uma assinatura são inválidos.';
    END IF;
    BEGIN
      v_ass_env_id := nullif(v_assinatura->>'envolvido_id', '')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Vínculo da assinatura inválido.';
    END;
    IF v_ass_env_id IS NULL OR NOT (v_ass_env_id = ANY(v_env_ids)) THEN
      RAISE EXCEPTION 'Toda assinatura precisa pertencer a um envolvido deste BO.';
    END IF;
    IF v_ass_env_id = ANY(v_ass_env_ids) THEN
      RAISE EXCEPTION 'Cada envolvido pode ter apenas uma assinatura.';
    END IF;

    v_data_assinatura := coalesce(v_assinatura->>'assinatura_data_url', '');
    IF length(v_data_assinatura) > 262144
       OR v_data_assinatura !~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$' THEN
      RAISE EXCEPTION 'A assinatura precisa ser uma imagem PNG válida.';
    END IF;
    v_total_bytes_assinaturas := v_total_bytes_assinaturas + length(v_data_assinatura);
    IF v_total_bytes_assinaturas > 1048576 THEN
      RAISE EXCEPTION 'O volume total das assinaturas excede o limite de 1 MiB para este BO.';
    END IF;

    SELECT lower(btrim(coalesce(item.value->>'tipo', ''))),
           btrim(regexp_replace(coalesce(item.value->>'nome_completo', ''), '[[:space:]]+', ' ', 'g')),
           nullif(btrim(coalesce(item.value->>'cpf', '')), '')
      INTO v_tipo, v_nome, v_cpf
    FROM jsonb_array_elements(v_envolvidos) AS item(value)
    WHERE item.value->>'id' = v_ass_env_id::text
    LIMIT 1;

    v_assinaturas := v_assinaturas || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(),
      'envolvido_id', v_ass_env_id,
      'tipo', v_tipo,
      'nome', v_nome,
      'cpf', v_cpf,
      'assinatura_data_url', v_data_assinatura,
      'assinado_em', clock_timestamp(),
      'assinado_por', v_eu,
      'nome_guarda', v_nome_guarda,
      'metodo', 'captura_manuscrita_em_tela'
    ));
    v_ass_env_ids := array_append(v_ass_env_ids, v_ass_env_id);
  END LOOP;

  -- O responsável é o GM autenticado, exceto quando o autor for administrador.
  v_resp := nullif(btrim(coalesce(p_dados->>'responsavel_id', '')), '')::uuid;
  IF v_resp IS NULL THEN
    IF v_perfil IN ('guarda', 'supervisor') THEN
      v_resp := v_eu;
    ELSE
      RAISE EXCEPTION 'Escolha o GM responsável: o administrador do sistema não assina atendimento em campo.';
    END IF;
  END IF;

  v_apoio := nullif(btrim(coalesce(p_dados->>'apoio_id', '')), '')::uuid;
  IF v_apoio IS NULL THEN
    RAISE EXCEPTION 'Escolha o GM que deu apoio. Nenhum atendimento é registrado sozinho.';
  END IF;
  IF v_apoio = v_resp THEN
    RAISE EXCEPTION 'O GM de apoio deve ser diferente do GM responsável pela ocorrência.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios AS u
    WHERE u.id = v_apoio AND u.status = 'ativo' AND u.deleted_at IS NULL
      AND u.perfil IN ('guarda', 'supervisor')
  ) THEN
    RAISE EXCEPTION 'O GM de apoio precisa estar cadastrado e ativo no sistema.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios AS u
    WHERE u.id = v_resp AND u.status = 'ativo' AND u.deleted_at IS NULL
      AND u.perfil IN ('guarda', 'supervisor')
  ) THEN
    RAISE EXCEPTION 'O GM responsável precisa estar cadastrado e ativo no sistema.';
  END IF;

  IF v_modo = 'completo' THEN
    v_completado_em := clock_timestamp();
    v_data_finalizacao := v_completado_em::timestamp without time zone;
  END IF;

  INSERT INTO public.ocorrencias (
    forma_solicitacao, tipo_ocorrencia, sub_tipo_ocorrencia, gravidade,
    local_ocorrencia, bairro_ocorrencia, referencia, rodovia, latitude, longitude,
    data_hora_inicio, data_hora_encerramento, data_hora_finalizacao, observacoes,
    numero_bo, orgao_bo, data_bo,
    nome_solicitante, telefone_solicitante, cpf_solicitante, rg_solicitante,
    endereco_solicitante, bairro_solicitante, codigo_municipal, complemento,
    identificacao_adicional, codigo_operacional,
    modo_criacao, origem_criacao, esta_ativa, numero_versao,
    status, criado_por, criado_em, atualizado_por,
    completado_em, completado_por, assinaturas
  )
  VALUES (
    btrim(p_dados->>'forma_solicitacao'), lower(btrim(p_dados->>'tipo_ocorrencia')),
    nullif(btrim(coalesce(p_dados->>'sub_tipo_ocorrencia', '')), ''), v_gravidade,
    btrim(regexp_replace(p_dados->>'local_ocorrencia', '[[:space:]]+', ' ', 'g')),
    nullif(btrim(regexp_replace(coalesce(p_dados->>'bairro_ocorrencia', ''), '[[:space:]]+', ' ', 'g')), ''),
    nullif(btrim(regexp_replace(coalesce(p_dados->>'referencia', ''), '[[:space:]]+', ' ', 'g')), ''),
    nullif(btrim(coalesce(p_dados->>'rodovia', '')), ''),
    nullif(p_dados->>'latitude', '')::numeric, nullif(p_dados->>'longitude', '')::numeric,
    v_inicio, v_enc, v_data_finalizacao,
    nullif(btrim(coalesce(p_dados->>'observacoes', '')), ''),
    v_bo,
    CASE WHEN v_bo IS NULL THEN NULL ELSE nullif(btrim(coalesce(p_dados->>'orgao_bo', '')), '') END,
    CASE WHEN v_bo IS NULL THEN NULL ELSE nullif(p_dados->>'data_bo', '')::date END,
    nullif(btrim(coalesce(p_dados->>'nome_solicitante', '')), ''),
    nullif(btrim(coalesce(p_dados->>'telefone_solicitante', '')), ''),
    nullif(btrim(coalesce(p_dados->>'cpf_solicitante', '')), ''),
    nullif(btrim(coalesce(p_dados->>'rg_solicitante', '')), ''),
    nullif(btrim(coalesce(p_dados->>'endereco_solicitante', '')), ''),
    nullif(btrim(coalesce(p_dados->>'bairro_solicitante', '')), ''),
    nullif(btrim(coalesce(p_dados->>'codigo_municipal', '')), ''),
    nullif(btrim(coalesce(p_dados->>'complemento', '')), ''),
    nullif(btrim(coalesce(p_dados->>'identificacao_adicional', '')), ''),
    nullif(btrim(coalesce(p_dados->>'codigo_operacional', '')), ''),
    v_modo, 'app', true, 1,
    'pending_sync', v_eu, now(), v_eu,
    v_completado_em, CASE WHEN v_completado_em IS NULL THEN NULL ELSE v_eu::text END,
    '[]'::jsonb
  )
  RETURNING id INTO v_id;

  INSERT INTO public.ocorrencia_guardas (
    ocorrencia_id, guarda_id, papel, ordem, esta_ativo, selecionado_por
  )
  VALUES
    (v_id, v_resp, 'responsavel', 1, true, v_eu),
    (v_id, v_apoio, 'acompanhante', 2, true, v_eu);

  FOR v_envolvido IN SELECT value FROM jsonb_array_elements(v_envolvidos) AS item(value) LOOP
    v_env_id := (v_envolvido->>'id')::uuid;
    v_tipo := lower(btrim(coalesce(v_envolvido->>'tipo', '')));
    v_nome := btrim(regexp_replace(coalesce(v_envolvido->>'nome_completo', ''), '[[:space:]]+', ' ', 'g'));
    v_cpf := nullif(btrim(coalesce(v_envolvido->>'cpf', '')), '');
    v_telefone := nullif(btrim(coalesce(v_envolvido->>'telefone', '')), '');
    v_observacoes := nullif(btrim(coalesce(v_envolvido->>'observacoes', '')), '');

    INSERT INTO public.envolvidos (
      id, ocorrencia_id, tipo, nome_completo, cpf, telefone, observacoes,
      criado_por, criado_em, atualizado_em
    )
    VALUES (
      v_env_id, v_id, v_tipo, v_nome, v_cpf, v_telefone, v_observacoes,
      v_eu, now(), now()
    );
  END LOOP;

  FOR v_assinatura IN SELECT value FROM jsonb_array_elements(v_assinaturas) AS item(value) LOOP
    INSERT INTO public.ocorrencia_assinaturas_privadas (
      ocorrencia_id, envolvido_id, assinatura_data_url, assinado_em,
      assinado_por, nome_guarda, metodo
    )
    VALUES (
      v_id,
      (v_assinatura->>'envolvido_id')::uuid,
      v_assinatura->>'assinatura_data_url',
      (v_assinatura->>'assinado_em')::timestamp with time zone,
      (v_assinatura->>'assinado_por')::uuid,
      coalesce(v_assinatura->>'nome_guarda', 'GM'),
      coalesce(v_assinatura->>'metodo', 'captura_manuscrita_em_tela')
    );
  END LOOP;

  -- A equipe, envolvidos e assinaturas só ficam visíveis como registro concluído após a transação.
  UPDATE public.ocorrencias
  SET status = 'synced'
  WHERE id = v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'numero_ocorrencia', (SELECT o.numero_ocorrencia FROM public.ocorrencias AS o WHERE o.id = v_id),
    'equipe', jsonb_build_object('responsavel_id', v_resp, 'apoio_id', v_apoio),
    'gravidade', v_gravidade,
    'modo_criacao', v_modo,
    'completado_em', v_completado_em,
    'status', 'synced'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.gm_registrar_ocorrencia(jsonb, jsonb) TO authenticated;

COMMIT;
