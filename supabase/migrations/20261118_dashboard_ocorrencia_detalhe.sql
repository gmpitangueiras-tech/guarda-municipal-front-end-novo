BEGIN;

CREATE OR REPLACE FUNCTION public.gm_dashboard_ocorrencia_detalhe(p_ocorrencia_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_ocorrencia public.ocorrencias%ROWTYPE;
  v_payload jsonb;
BEGIN
  IF NOT public.gm_is_active_profile() THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem acesso';
  END IF;

  SELECT o.*
    INTO v_ocorrencia
  FROM public.ocorrencias AS o
  WHERE o.id = p_ocorrencia_id
    AND o.deleted_at IS NULL
    AND public.gm_can_manage_occurrence(o.id) IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem acesso';
  END IF;

  SELECT jsonb_build_object(
    'ocorrencia', jsonb_build_object(
      'id', v_ocorrencia.id,
      'numero_ocorrencia', v_ocorrencia.numero_ocorrencia,
      'numero_temporario', v_ocorrencia.numero_temporario,
      'status', v_ocorrencia.status,
      'forma_solicitacao', v_ocorrencia.forma_solicitacao,
      'nome_solicitante', v_ocorrencia.nome_solicitante,
      'telefone_solicitante', v_ocorrencia.telefone_solicitante,
      'endereco_solicitante', v_ocorrencia.endereco_solicitante,
      'codigo_municipal', v_ocorrencia.codigo_municipal,
      'complemento', v_ocorrencia.complemento,
      'bairro_solicitante', v_ocorrencia.bairro_solicitante,
      'identificacao_adicional', v_ocorrencia.identificacao_adicional,
      'codigo_operacional', v_ocorrencia.codigo_operacional,
      'local_ocorrencia', v_ocorrencia.local_ocorrencia,
      'rodovia', v_ocorrencia.rodovia,
      'bairro_ocorrencia', v_ocorrencia.bairro_ocorrencia,
      'referencia', v_ocorrencia.referencia,
      'data_hora_inicio', v_ocorrencia.data_hora_inicio,
      'data_hora_encerramento', v_ocorrencia.data_hora_encerramento,
      'latitude', v_ocorrencia.latitude,
      'longitude', v_ocorrencia.longitude,
      'observacoes', v_ocorrencia.observacoes,
      'criado_por', v_ocorrencia.criado_por,
      'criado_em', v_ocorrencia.criado_em,
      'cancelado_em', v_ocorrencia.cancelado_em,
      'motivo_cancelamento', v_ocorrencia.motivo_cancelamento,
      'ocorrencia_original_id', v_ocorrencia.ocorrencia_original_id,
      'justificativa_retificacao', v_ocorrencia.justificativa_retificacao,
      'retificado_em', v_ocorrencia.retificado_em,
      'numero_versao', v_ocorrencia.numero_versao,
      'campos_alterados', v_ocorrencia.campos_alterados,
      'solicitacao_retificacao_justificativa', v_ocorrencia.solicitacao_retificacao_justificativa,
      'solicitada_em', v_ocorrencia.solicitada_em,
      'aprovada_em', v_ocorrencia.aprovada_em,
      'rejeitada_em', v_ocorrencia.rejeitada_em,
      'motivo_rejeicao', v_ocorrencia.motivo_rejeicao,
      'tipo_ocorrencia', v_ocorrencia.tipo_ocorrencia,
      'sub_tipo_ocorrencia', v_ocorrencia.sub_tipo_ocorrencia,
      'gravidade', v_ocorrencia.gravidade,
      'numero_bo', v_ocorrencia.numero_bo,
      'orgao_bo', v_ocorrencia.orgao_bo,
      'data_bo', v_ocorrencia.data_bo,
      'cpf_solicitante', v_ocorrencia.cpf_solicitante,
      'rg_solicitante', v_ocorrencia.rg_solicitante,
      'hash_pericial', v_ocorrencia.hash_pericial,
      'data_hora_finalizacao', v_ocorrencia.data_hora_finalizacao,
      'completado_em', v_ocorrencia.completado_em,
      'completado_por', v_ocorrencia.completado_por,
      'modo_criacao', v_ocorrencia.modo_criacao,
      'origem_criacao', v_ocorrencia.origem_criacao
    ),
    'criador', (
      SELECT jsonb_build_object(
        'nome_completo', u.nome_completo,
        'matricula', u.matricula,
        'perfil', u.perfil
      )
      FROM public.usuarios AS u
      WHERE u.id = v_ocorrencia.criado_por
      LIMIT 1
    ),
    'equipe', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'papel', og.papel,
        'nome_completo', og.nome_snapshot,
        'matricula', og.matricula_snapshot,
        'perfil', og.perfil_snapshot
      ) ORDER BY og.ordem)
      FROM public.ocorrencia_guardas AS og
      WHERE og.ocorrencia_id = v_ocorrencia.id
        AND og.esta_ativo IS TRUE
    ), '[]'::jsonb),
    'envolvidos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'tipo', e.tipo,
        'nome_completo', e.nome_completo,
        'data_nascimento', e.data_nascimento,
        'rg', e.rg,
        'cpf', e.cpf,
        'telefone', e.telefone,
        'nome_pai', e.nome_pai,
        'nome_mae', e.nome_mae,
        'endereco', e.endereco,
        'bairro', e.bairro,
        'cidade', e.cidade,
        'observacoes', e.observacoes
      ))
      FROM public.envolvidos AS e
      WHERE e.ocorrencia_id = v_ocorrencia.id
    ), '[]'::jsonb),
    'assinaturas',
      CASE
        WHEN jsonb_typeof(v_ocorrencia.assinaturas) = 'array'
          THEN v_ocorrencia.assinaturas
        ELSE '[]'::jsonb
      END
      || coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'assinatura_data_url', ap.assinatura_data_url,
          'envolvido_id', ap.envolvido_id,
          'tipo', e.tipo,
          'nome', e.nome_completo,
          'cpf', e.cpf,
          'assinado_em', ap.assinado_em,
          'assinado_por', ap.assinado_por,
          'nome_guarda', ap.nome_guarda,
          'metodo', ap.metodo
        ) ORDER BY ap.assinado_em)
        FROM public.ocorrencia_assinaturas_privadas AS ap
        JOIN public.envolvidos AS e
          ON e.id = ap.envolvido_id
         AND e.ocorrencia_id = ap.ocorrencia_id
        WHERE ap.ocorrencia_id = v_ocorrencia.id
      ), '[]'::jsonb),
    'anexos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'nome_arquivo', a.nome_arquivo,
        'tipo_arquivo', a.tipo_arquivo,
        'mime_type', a.mime_type,
        'tamanho', a.tamanho,
        'url', a.url,
        'url_thumb', a.url_thumb,
        'criado_em', a.criado_em
      ) ORDER BY a.criado_em ASC)
      FROM public.anexos AS a
      WHERE a.ocorrencia_id = v_ocorrencia.id
        AND a.deleted_at IS NULL
    ), '[]'::jsonb),
    'historico', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', h.id,
        'is_original', h.ocorrencia_original_id IS NULL,
        'numero_versao', h.numero_versao,
        'criado_em', h.criado_em,
        'retificado_em', h.retificado_em,
        'status', h.status,
        'campos_alterados', h.campos_alterados
      ) ORDER BY h.numero_versao ASC, h.criado_em ASC)
      FROM public.ocorrencias AS h
      WHERE h.deleted_at IS NULL
        AND coalesce(h.ocorrencia_original_id, h.id) =
            coalesce(v_ocorrencia.ocorrencia_original_id, v_ocorrencia.id)
    ), '[]'::jsonb)
  ) INTO v_payload;

  RETURN v_payload;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.gm_dashboard_ocorrencia_detalhe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gm_dashboard_ocorrencia_detalhe(uuid) TO authenticated;

COMMENT ON FUNCTION public.gm_dashboard_ocorrencia_detalhe(uuid) IS
  'Retorna detalhes allowlistados de uma ocorrência somente para perfil ativo autorizado por gm_can_manage_occurrence.';

COMMIT;
