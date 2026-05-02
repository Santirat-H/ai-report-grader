import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL') as string,
      this.configService.get<string>('SUPABASE_SECRET') as string,
    );
  }

  async uploadFile(file: Express.Multer.File, bucket: string = 'pdfs') {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      name: file.originalname,
      size: file.size,
      url: publicUrlData.publicUrl,
    };
  }

  async deleteFile(fileName: string, bucket: string = 'pdfs') {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      throw error;
    }
    return true;
  }

  async listFiles(bucket: string = 'pdfs') {
    const { data, error } = await this.supabase.storage.from(bucket).list();
    if (error) {
      throw error;
    }
    
    return data.map((file: any) => {
      const { data: publicUrlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(file.name);
        
      return {
        id: file.id || file.name,
        name: file.name,
        size: file.size || 0,
        createdAt: file.created_at,
        url: publicUrlData.publicUrl,
      };
    })
    .filter(file => file.name !== '.emptyFolderPlaceholder')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  // Query the File metadata table via Supabase's PostgREST HTTP API.
  // This is significantly faster than going through a raw TCP connection to Postgres
  // (PrismaPg), because the Supabase JS client uses persistent HTTP keep-alive
  // connections routed through Supabase's optimised edge layer.
  async getFilesFromDB(projectId?: string) {
    let query = this.supabase
      .from('File')
      .select('id, name, size, url, createdAt, status, totalScore, projectId, SectionScore(sectionName, score)')
      .order('createdAt', { ascending: false });

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((file: any) => {
      const scores = { content: 0, synthesis: 0, references: 0, format: 0 };
      if (file.SectionScore && Array.isArray(file.SectionScore)) {
        for (const s of file.SectionScore) {
          const key = (s.sectionName || '').toLowerCase();
          if (['content', 'synthesis', 'references', 'format'].includes(key)) {
            scores[key as keyof typeof scores] = s.score;
          }
        }
      }
      const { SectionScore, ...rest } = file;
      return { ...rest, scores };
    });
  }
}
